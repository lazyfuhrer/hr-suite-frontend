import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, MapPin } from "lucide-react";
import { toast } from "react-hot-toast";
import { createOfficeLocation, updateOfficeLocation } from "../../api/settings";
import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const CreateOfficeLocationModal = ({ isOpen, onClose, onSuccess, editData }) => {
  const [loading, setLoading] = useState(false);
  const initialForm = {
    name: "",
    location: "",
    latitude: "",
    longitude: "",
    radius_meters: ""
  };
  const [formData, setFormData] = useState(initialForm);
  const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ["places"]
  });
  const autocompleteRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const defaultCenter = useMemo(() => ({ lat: 12.9716, lng: 77.5946 }), []);
  const selectedLat = Number(formData.latitude);
  const selectedLng = Number(formData.longitude);
  const hasSelectedCoords = Number.isFinite(selectedLat) && Number.isFinite(selectedLng);
  const mapCenter = useMemo(
    () => (hasSelectedCoords ? { lat: selectedLat, lng: selectedLng } : defaultCenter),
    [defaultCenter, hasSelectedCoords, selectedLat, selectedLng]
  );

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      if (!window.google?.maps?.Geocoder) return;
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      const formatted = result?.results?.[0]?.formatted_address;
      if (formatted) {
        setFormData((prev) => ({ ...prev, location: formatted }));
      }
    } catch {
      // ignore reverse-geocode failures; lat/lng are still valid
    }
  }, []);

  const setCoords = useCallback(
    (lat, lng, { updateAddress } = { updateAddress: true }) => {
      setFormData((prev) => ({
        ...prev,
        latitude: Number(lat).toFixed(6),
        longitude: Number(lng).toFixed(6)
      }));
      if (updateAddress) reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  // Sync state with editData when modal opens in edit mode
  useEffect(() => {
    if (isOpen && editData) {
      const locationValue = editData.address || "";
      setFormData({
        name: editData.name || "",
        location: locationValue,
        latitude: editData.latitude || "",
        longitude: editData.longitude || "",
        radius_meters: editData.radius_meters || ""
      });
    } else if (isOpen) {
      setFormData(initialForm);
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    setFormData(initialForm);
    onClose();
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace?.();
    const lat = place?.geometry?.location?.lat?.();
    const lng = place?.geometry?.location?.lng?.();
    const formattedAddress = place?.formatted_address || place?.name;
    if (formattedAddress) {
      setFormData((prev) => ({ ...prev, location: formattedAddress }));
    }
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setCoords(lat, lng, { updateAddress: false });
      mapInstanceRef.current?.panTo?.({ lat, lng });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return toast.error("Office name is required");
    if (!formData.location.trim()) return toast.error("Location is required");
    if (!formData.latitude || !formData.longitude) return toast.error("Please select a location on the map");
    
    const radiusValue = Number(formData.radius_meters);
    if (!formData.radius_meters || Number.isNaN(radiusValue)) {
      return toast.error("Radius is required");
    }
    if (radiusValue < 100) {
      return toast.error("Radius cannot be less than 100 meters");
    }

    const payload = {
      name: formData.name.trim(),
      address: formData.location.trim(),
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      radius_meters: radiusValue
    };

    setLoading(true);
    try {
      if (editData) {
        const id = editData.id || editData._id;
        await updateOfficeLocation(id, payload);
        toast.success("Office location updated successfully");
      } else {
        await createOfficeLocation(payload);
        toast.success("Office location created successfully");
      }
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-[600px] rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-2 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">
              {editData ? "Edit Office Location" : "Create Office Location"}
            </h2>
            <p className="text-sm text-gray-500">
              {editData ? "Update existing details" : "Enter the location details to initiate"}
            </p>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <hr className="mx-6 border-gray-100" />

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Office Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Office Name <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter office name"
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Address/Location <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            {googleMapsApiKey ? (
              isLoaded ? (
                <Autocomplete
                  onLoad={(instance) => {
                    autocompleteRef.current = instance;
                  }}
                  onPlaceChanged={handlePlaceChanged}
                >
                  <input
                    type="text"
                    placeholder="Search address"
                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                  />
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  placeholder="Loading Google Places..."
                  className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  disabled
                />
              )
            ) : (
              <input
                type="text"
                placeholder="Set VITE_GOOGLE_MAPS_API_KEY to enable search"
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
              />
            )}
            {!!loadError && (
              <div className="text-xs text-red-600 font-medium">
                Failed to load Google Maps. Check API key restrictions and enabled APIs.
              </div>
            )}
          </div>

          {/* Radius */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Radius (meters) <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <input
              type="number"
              placeholder="100"
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
              value={formData.radius_meters}
              onChange={(e) => handleChange("radius_meters", e.target.value)}
            />
          </div>

          {/* Map */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={14} />
              Select Location on Map
              <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>

            <div className="relative">
              {googleMapsApiKey ? (
                isLoaded ? (
                  <div className="w-full h-64 rounded-xl overflow-hidden border-2 border-gray-100">
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={mapCenter}
                      zoom={hasSelectedCoords ? 15 : 13}
                      onLoad={(map) => {
                        mapInstanceRef.current = map;
                      }}
                      onClick={(event) => {
                        const lat = event?.latLng?.lat?.();
                        const lng = event?.latLng?.lng?.();
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                        setCoords(lat, lng, { updateAddress: true });
                      }}
                      options={{
                        streetViewControl: false,
                        fullscreenControl: false,
                        mapTypeControl: false
                      }}
                    >
                      <Marker
                        position={mapCenter}
                        draggable
                        onDragEnd={(event) => {
                          const lat = event?.latLng?.lat?.();
                          const lng = event?.latLng?.lng?.();
                          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                          setCoords(lat, lng, { updateAddress: true });
                        }}
                      />
                    </GoogleMap>
                  </div>
                ) : (
                  <div className="w-full h-64 rounded-xl overflow-hidden border-2 border-gray-100 bg-gray-50 flex items-center justify-center">
                    <p className="text-sm text-gray-500">Loading map...</p>
                  </div>
                )
              ) : (
                <div className="w-full h-64 rounded-xl overflow-hidden border-2 border-gray-100 bg-gray-50 flex items-center justify-center">
                  <div className="text-center px-6">
                    <p className="text-sm font-semibold text-gray-700">Google Maps is not configured</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Add <span className="font-mono">VITE_GOOGLE_MAPS_API_KEY</span> and reload to enable map picking.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 italic">
              Click on the map or drag the marker to select exact location
            </p>

            {!googleMapsApiKey && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Latitude</label>
                  <input
                    type="number"
                    placeholder="12.971600"
                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
                    value={formData.latitude}
                    onChange={(e) => handleChange("latitude", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Longitude</label>
                  <input
                    type="number"
                    placeholder="77.594600"
                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
                    value={formData.longitude}
                    onChange={(e) => handleChange("longitude", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 pt-2 flex justify-between items-center bg-white border-t border-gray-50">
          <button onClick={handleClose} className="text-sm font-bold text-[#6B2D0F] hover:underline">
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="px-8 py-3 bg-[#FF5722] text-white text-sm font-bold rounded-xl hover:bg-[#E64A19] transition-colors disabled:opacity-50 shadow-lg shadow-orange-200"
          >
            {loading ? "Processing..." : editData ? "Update Location" : "Save Location"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOfficeLocationModal;