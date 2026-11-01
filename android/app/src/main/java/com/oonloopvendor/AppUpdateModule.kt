package com.oonloopvendor.merchant

import android.app.Activity
import android.content.Intent
import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.common.LifecycleState
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ViewManager
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

/** One application-context manager. Activity references are only local to a launch. */
class AppUpdateModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), LifecycleEventListener, ActivityEventListener {
    private var manager: AppUpdateManager? = null
    private var listenerCount = 0
    private var listening = false
    private var destroyed = false
    private var flowPromise: Promise? = null
    private var completing = false

    private val installListener = InstallStateUpdatedListener { state ->
        try {
            if (!destroyed && listening && context.hasActiveReactInstance()) {
                val event = Arguments.createMap().apply {
                    putInt("installStatus", state.installStatus())
                    putDouble("bytesDownloaded", state.bytesDownloaded().toDouble())
                    putDouble("totalBytesToDownload", state.totalBytesToDownload().toDouble())
                }
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("AppUpdateStatus", event)
            }
        } catch (error: Exception) {
            log(error)
        }
    }

    init {
        context.addLifecycleEventListener(this)
        context.addActivityEventListener(this)
    }

    override fun getName() = "AppUpdate"

    private fun log(error: Exception) {
        if (BuildConfig.DEBUG) Log.d("AppUpdate", "Update API unavailable", error)
    }

    private fun getManager(): AppUpdateManager {
        check(!destroyed && !BuildConfig.DEBUG) { "Updates unavailable in this runtime" }
        return manager ?: AppUpdateManagerFactory.create(context.applicationContext).also { manager = it }
    }

    private fun runSafely(promise: Promise, action: () -> Unit) {
        UiThreadUtil.runOnUiThread {
            try {
                check(!destroyed) { "Update module disposed" }
                action()
            } catch (error: Exception) {
                promise.reject("APP_UPDATE_UNAVAILABLE", error)
            }
        }
    }

    private fun updateListener() {
        try {
            val required = !destroyed && !BuildConfig.DEBUG && listenerCount > 0 &&
                context.lifecycleState == LifecycleState.RESUMED
            if (required && !listening) {
                getManager().registerListener(installListener)
                listening = true
            } else if (!required && listening) {
                manager?.unregisterListener(installListener)
                listening = false
            }
        } catch (error: Exception) {
            log(error)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        UiThreadUtil.runOnUiThread {
            if (eventName == "AppUpdateStatus") listenerCount++
            updateListener()
        }
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        UiThreadUtil.runOnUiThread {
            listenerCount = (listenerCount - count.toInt()).coerceAtLeast(0)
            updateListener()
        }
    }

    private fun snapshot(info: AppUpdateInfo): WritableMap = Arguments.createMap().apply {
        putInt("updateAvailability", info.updateAvailability())
        putInt("installStatus", info.installStatus())
        putInt("availableVersionCode", info.availableVersionCode())
        putBoolean("flexibleAllowed", info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE))
        putBoolean("immediateAllowed", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE))
        putInt("updatePriority", info.updatePriority())
        val days = info.clientVersionStalenessDays()
        if (days == null) putNull("clientVersionStalenessDays")
        else putInt("clientVersionStalenessDays", days)
        putDouble("bytesDownloaded", info.bytesDownloaded().toDouble())
        putDouble("totalBytesToDownload", info.totalBytesToDownload().toDouble())
    }

    @ReactMethod
    fun getUpdateInfo(promise: Promise) = runSafely(promise) {
        getManager().appUpdateInfo
            .addOnSuccessListener { info ->
                runSafely(promise) { promise.resolve(snapshot(info)) }
            }
            .addOnFailureListener { promise.reject("APP_UPDATE_CHECK", it) }
    }

    @ReactMethod
    fun startUpdate(updateType: Int, promise: Promise) = runSafely(promise) {
        check(flowPromise == null) { "Update flow already active" }
        require(updateType == AppUpdateType.FLEXIBLE || updateType == AppUpdateType.IMMEDIATE)
        val updates = getManager()
        flowPromise = promise
        // AppUpdateInfo can only launch once: always fetch a fresh instance.
        try {
            updates.appUpdateInfo.addOnSuccessListener { info ->
                if (flowPromise !== promise) return@addOnSuccessListener
                try {
                    val activity = context.currentActivity
                    check(!destroyed && activity != null && !activity.isFinishing && !activity.isDestroyed &&
                        context.lifecycleState == LifecycleState.RESUMED) { "No foreground Activity" }
                    val resuming = updateType == AppUpdateType.IMMEDIATE &&
                        info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
                    check((info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE || resuming) &&
                        info.isUpdateTypeAllowed(updateType)) { "Update type unavailable" }
                    if (!resuming && info.installStatus() in listOf(InstallStatus.PENDING,
                            InstallStatus.DOWNLOADING, InstallStatus.DOWNLOADED, InstallStatus.INSTALLING)) {
                        flowPromise = null
                        promise.resolve("in_progress")
                        return@addOnSuccessListener
                    }
                    updateListener()
                    check(updates.startUpdateFlowForResult(info, activity,
                        AppUpdateOptions.newBuilder(updateType).build(), REQUEST_CODE)) { "Update flow not launched" }
                } catch (error: Exception) {
                    flowPromise = null
                    promise.reject("APP_UPDATE_START", error)
                }
            }.addOnFailureListener {
                if (flowPromise === promise) {
                    flowPromise = null
                    promise.reject("APP_UPDATE_START", it)
                }
            }
        } catch (error: Exception) {
            flowPromise = null
            throw error
        }
    }

    @ReactMethod
    fun completeUpdate(promise: Promise) = runSafely(promise) {
        check(!completing && context.lifecycleState == LifecycleState.RESUMED) { "Cannot complete update now" }
        val updates = getManager()
        completing = true
        try {
            updates.completeUpdate().addOnSuccessListener {
                completing = false
                promise.resolve(null)
            }.addOnFailureListener {
                completing = false
                promise.reject("APP_UPDATE_COMPLETE", it)
            }
        } catch (error: Exception) {
            completing = false
            throw error
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_CODE) return
        val promise = flowPromise
        flowPromise = null
        // RESULT_OK means consent, not installation success.
        promise?.resolve(when (resultCode) {
            Activity.RESULT_OK -> "accepted"
            Activity.RESULT_CANCELED -> "canceled"
            else -> "failed"
        })
    }

    override fun onNewIntent(intent: Intent) = Unit
    override fun onHostResume() = updateListener()
    override fun onHostPause() = updateListener()
    override fun onHostDestroy() {
        flowPromise?.reject("APP_UPDATE_ACTIVITY_DESTROYED", "Activity destroyed")
        flowPromise = null
        updateListener()
    }

    override fun invalidate() {
        UiThreadUtil.runOnUiThread {
            destroyed = true
            listenerCount = 0
            updateListener()
            flowPromise?.reject("APP_UPDATE_DISPOSED", "Update module disposed")
            flowPromise = null
            context.removeLifecycleEventListener(this)
            context.removeActivityEventListener(this)
            manager = null
        }
        super.invalidate()
    }

    private companion object { const val REQUEST_CODE = 42140 }
}

class AppUpdatePackage : ReactPackage {
    @Suppress("OVERRIDE_DEPRECATION")
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(AppUpdateModule(reactContext))
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
