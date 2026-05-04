// services/PlacesService.ts

const GOOGLE_MAPS_API_KEY = "AIzaSyD06rgmMtvcUfRMvFNvXlnn0rwpGUUzzAc";

export interface Prediction {
    description: string;
    place_id: string;
}

export interface PlaceDetails {
    formattedAddress: string;
    addressLine1: string;
    addressLine2: string;
    landmark: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    lat: number;
    lng: number;
}

class PlacesService {
    async fetchAddressPredictions(
        input: string
    ): Promise<{ success: boolean; data: Prediction[]; message?: string }> {
        if (!input || input.trim().length === 0) {
            return { success: true, data: [] };
        }

        const encodedInput = encodeURIComponent(input);
        const url =
            `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
            `?input=${encodedInput}` +
            `&types=address` +
            `&components=country:IN` +
            `&key=${GOOGLE_MAPS_API_KEY}`;

        try {
            const response = await fetch(url);
            const json = await response.json();

            if (json.status === "OK" || json.status === "ZERO_RESULTS") {
                const predictions: Prediction[] = (json.predictions || []).map(
                    (e: any) => ({
                        description: e.description,
                        place_id: e.place_id,
                    })
                );
                return { success: true, data: predictions };
            } else {
                return {
                    success: false,
                    data: [],
                    message: `Google Places API Error: ${json.status}`,
                };
            }
        } catch (e: any) {
            return { success: false, data: [], message: e.toString() };
        }
    }

    async fetchPlaceDetailsById(
        placeId: string
    ): Promise<PlaceDetails | null> {
        const url =
            `https://maps.googleapis.com/maps/api/place/details/json` +
            `?place_id=${placeId}` +
            `&fields=address_component,geometry,formatted_address` +
            `&key=${GOOGLE_MAPS_API_KEY}`;

        try {
            const response = await fetch(url);
            const json = await response.json();

            if (json.status === "OK" && json.result) {
                const result = json.result;
                const components: any[] = result.address_components || [];

                let streetNumber = "";
                let route = "";
                let sublocality = "";
                let city = "";
                let state = "";
                let postalCode = "";
                let country = "";

                for (const c of components) {
                    const types: string[] = c.types || [];

                    if (types.includes("street_number")) streetNumber = c.long_name;
                    if (types.includes("route")) route = c.long_name;
                    if (
                        types.includes("sublocality_level_1") ||
                        types.includes("sublocality")
                    )
                        sublocality = c.long_name;
                    if (types.includes("locality")) city = c.long_name;
                    if (types.includes("administrative_area_level_1"))
                        state = c.long_name;
                    if (types.includes("postal_code")) postalCode = c.long_name;
                    if (types.includes("country")) country = c.long_name;
                }

                const addressLine1 = [streetNumber, route].filter(Boolean).join(" ");
                const addressLine2 = sublocality;

                const location = result.geometry?.location;

                return {
                    formattedAddress: result.formatted_address || "",
                    addressLine1,
                    addressLine2,
                    landmark: "",
                    city,
                    state,
                    postalCode,
                    country,
                    lat: location?.lat ?? 0,
                    lng: location?.lng ?? 0,
                };
            }
        } catch (e) {
            console.error("Place Details Error:", e);
        }

        return null;
    }

    async fetchAddressFromLatLng(
        lat: number,
        lng: number
    ): Promise<PlaceDetails | null> {
        const url =
            `https://maps.googleapis.com/maps/api/geocode/json` +
            `?latlng=${lat},${lng}` +
            `&key=${GOOGLE_MAPS_API_KEY}`;

        try {
            const response = await fetch(url);
            const json = await response.json();
            console.log(json)

            if (json.status === "OK" && json.results.length > 0) {
                const result = json.results[0];
                const components: any[] = result.address_components || [];

                let streetNumber = "";
                let route = "";
                let sublocality = "";
                let city = "";
                let state = "";
                let postalCode = "";
                let country = "";

                for (const c of components) {
                    const types: string[] = c.types || [];

                    if (types.includes("street_number")) streetNumber = c.long_name;
                    if (types.includes("route")) route = c.long_name;
                    if (
                        types.includes("sublocality_level_1") ||
                        types.includes("sublocality")
                    )
                        sublocality = c.long_name;
                    if (types.includes("locality")) city = c.long_name;
                    if (types.includes("administrative_area_level_1"))
                        state = c.long_name;
                    if (types.includes("postal_code")) postalCode = c.long_name;
                    if (types.includes("country")) country = c.long_name;
                }

                const addressLine1 = [streetNumber, route].filter(Boolean).join(" ");
                const addressLine2 = sublocality;

                const location = result.geometry?.location;

                return {
                    formattedAddress: result.formatted_address || "",
                    addressLine1,
                    addressLine2,
                    landmark: "",
                    city,
                    state,
                    postalCode,
                    country,
                    lat: location?.lat ?? lat,
                    lng: location?.lng ?? lng,
                };
            }
        } catch (e) {
            console.error("Reverse Geocoding Error:", e);
        }

        return null;
    }
}

export const placesService = new PlacesService();
