import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Navigation, Clock, Route as RouteIcon, AlertCircle, Briefcase, Home, Car, Bike, Footprints, Bus, Shuffle, Maximize, ChevronDown, X, Star } from 'lucide-react';

// --- Types ---
interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface TransitLeg {
  type: 'bus' | 'walk';
  line?: string;
  instruction: string;
  duration: number;
  stopName?: string;
}

interface TransitOption {
  id: string;
  name: string;
  duration: number;
  distance: number;
  transfers: number;
  stops: number;
  description: string;
  route: [number, number][];
  legs: TransitLeg[];
  destinationName: string;
  destinationCoords: [number, number];
}

// Custom icons for Home and Work
const createCustomIcon = (color: string, iconHtml: string) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">${iconHtml}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const homeIcon = createCustomIcon('#3b82f6', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'); // blue-500
const workIcon = createCustomIcon('#ef4444', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>'); // red-500

// Map bounds updater component
function MapUpdater({ homeCoords, workCoords, route }: { homeCoords: [number, number] | null, workCoords: [number, number] | null, route: [number, number][] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (homeCoords && workCoords) {
      const bounds = L.latLngBounds([homeCoords, workCoords]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (homeCoords) {
      map.setView(homeCoords, 13);
    } else if (workCoords) {
      map.setView(workCoords, 13);
    }
  }, [homeCoords, workCoords, route, map]);
  
  return null;
}

export default function App() {
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [homeCoords, setHomeCoords] = useState<[number, number] | null>(null);
  const [workCoords, setWorkCoords] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState('driving');
  const [routeType, setRouteType] = useState('optimal');
  
  // New States
  const [homeSuggestions, setHomeSuggestions] = useState<Suggestion[]>([]);
  const [workSuggestions, setWorkSuggestions] = useState<Suggestion[]>([]);
  const [showHomeSuggestions, setShowHomeSuggestions] = useState(false);
  const [showWorkSuggestions, setShowWorkSuggestions] = useState(false);
  const [transitOptions, setTransitOptions] = useState<TransitOption[]>([]);
  const [selectedTransitId, setSelectedTransitId] = useState<string | null>(null);

  // Default center (San Francisco)
  const defaultCenter: [number, number] = [37.7749, -122.4194];

  const geocode = async (address: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  };

  // --- Autofill Logic ---
  const fetchSuggestions = async (query: string, type: 'home' | 'work') => {
    if (query.length < 3) {
      if (type === 'home') setHomeSuggestions([]);
      else setWorkSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      if (type === 'home') setHomeSuggestions(data);
      else setWorkSuggestions(data);
    } catch (err) {
      console.error("Suggestions error:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (homeAddress && showHomeSuggestions) fetchSuggestions(homeAddress, 'home');
    }, 300);
    return () => clearTimeout(timer);
  }, [homeAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (workAddress && showWorkSuggestions) fetchSuggestions(workAddress, 'work');
    }, 300);
    return () => clearTimeout(timer);
  }, [workAddress]);

  // --- Bus Simulation Logic ---
  const simulateTransitOptions = async (start: [number, number], end: [number, number]): Promise<TransitOption[]> => {
    // Get base route
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&alternatives=true`);
    const data = await response.json();
    
    if (data.code !== 'Ok') return [];

    const baseRoute = data.routes[0];
    const coords = baseRoute.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);

    // Helper to generate random destination nearby
    const getNearby = (base: [number, number], offset: number) => [base[0] + (Math.random() - 0.5) * offset, base[1] + (Math.random() - 0.5) * offset] as [number, number];

    return [
      {
        id: 'direct',
        name: 'Express Bus 101',
        duration: baseRoute.duration * 1.2,
        distance: baseRoute.distance,
        transfers: 0,
        stops: 4,
        description: 'Fastest direct route with minimal stops.',
        route: coords,
        destinationName: 'Downtown Transit Center',
        destinationCoords: getNearby(end, 0.005),
        legs: [
          { type: 'walk', instruction: 'Walk to Main St Station', duration: 300 },
          { type: 'bus', line: '101 Express', instruction: 'Take Bus 101 to Downtown', duration: baseRoute.duration * 1.1, stopName: 'Downtown Transit Center' }
        ]
      },
      {
        id: 'multi-transfer',
        name: 'Local Network (Priority)',
        duration: baseRoute.duration * 0.9,
        distance: baseRoute.distance * 1.1,
        transfers: 2,
        stops: 12,
        description: 'More transfers but uses dedicated bus lanes to avoid peak traffic.',
        route: coords,
        destinationName: 'Corporate Plaza North',
        destinationCoords: getNearby(end, 0.008),
        legs: [
          { type: 'bus', line: 'Blue Line', instruction: 'Take Blue Line to Central Hub', duration: baseRoute.duration * 0.4, stopName: 'Central Hub' },
          { type: 'walk', instruction: 'Transfer at Central Hub', duration: 180 },
          { type: 'bus', line: 'Green Line', instruction: 'Take Green Line to Corporate Plaza', duration: baseRoute.duration * 0.4, stopName: 'Corporate Plaza North' }
        ]
      },
      {
        id: 'scenic',
        name: 'Route 42 (Scenic)',
        duration: baseRoute.duration * 1.5,
        distance: baseRoute.distance * 1.3,
        transfers: 1,
        stops: 8,
        description: 'Longer route through the residential district.',
        route: coords,
        destinationName: 'Eastside Heights',
        destinationCoords: getNearby(end, 0.01),
        legs: [
          { type: 'bus', line: '42 Scenic', instruction: 'Take Bus 42 to Hilltop', duration: baseRoute.duration * 0.8, stopName: 'Hilltop View' },
          { type: 'bus', line: '15 Local', instruction: 'Take Bus 15 to Eastside', duration: baseRoute.duration * 0.6, stopName: 'Eastside Heights' }
        ]
      }
    ];
  };

  // --- Random/Longest Path Logic ---
  const fetchSpecialRoute = async (start: [number, number], end: [number, number], type: 'random' | 'longest') => {
    const latDiff = end[0] - start[0];
    const lonDiff = end[1] - start[1];
    const dist = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
    
    let waypoints: [number, number][] = [start];
    
    if (type === 'random') {
      // Pick 3 random points in a wider bounding box to ensure non-optimality
      for (let i = 0; i < 3; i++) {
        const randLat = start[0] + Math.random() * latDiff + (Math.random() - 0.5) * dist;
        const randLon = start[1] + Math.random() * lonDiff + (Math.random() - 0.5) * dist;
        waypoints.push([randLat, randLon]);
      }
    } else {
      // Pick points far away in perpendicular directions to force a massive detour
      // Calculate perpendicular vector
      const perpLat = -lonDiff;
      const perpLon = latDiff;
      
      const detour1: [number, number] = [
        start[0] + latDiff * 0.5 + perpLat * 1.5,
        start[1] + lonDiff * 0.5 + perpLon * 1.5
      ];
      
      const detour2: [number, number] = [
        start[0] + latDiff * 0.5 - perpLat * 1.5,
        start[1] + lonDiff * 0.5 - perpLon * 1.5
      ];
      
      waypoints.push(detour1);
      waypoints.push(detour2);
    }
    
    waypoints.push(end);
    
    const waypointStr = waypoints.map(w => `${w[1]},${w[0]}`).join(';');
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${waypointStr}?overview=full&geometries=geojson`);
    const data = await response.json();
    return data;
  };

  const fetchRoute = async (start: [number, number], end: [number, number], selectedMode: string, selectedRouteType: string) => {
    try {
      setTransitOptions([]);
      setSelectedTransitId(null);

      if (selectedMode === 'bus') {
        const options = await simulateTransitOptions(start, end);
        setTransitOptions(options);
        if (options.length > 0) {
          // Prioritize the one with more transfers but less time (simulated)
          const priority = options.find(o => o.id === 'multi-transfer') || options[0];
          setSelectedTransitId(priority.id);
          setRoute(priority.route);
          setDistance(priority.distance);
          setDuration(priority.duration);
          
          // Update destination to match the bus route's end
          setWorkAddress(priority.destinationName);
          setWorkCoords(priority.destinationCoords);
        }
        return;
      }

      let data;
      if (selectedRouteType === 'random') {
        data = await fetchSpecialRoute(start, end, 'random');
      } else if (selectedRouteType === 'longest') {
        data = await fetchSpecialRoute(start, end, 'longest');
      } else {
        const osrmMode = selectedMode === 'cycling' ? 'bike' : selectedMode === 'walking' ? 'foot' : 'driving';
        const response = await fetch(`https://router.project-osrm.org/route/v1/${osrmMode}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&alternatives=true`);
        data = await response.json();
      }
      
      if (data.code === 'Ok' && data.routes.length > 0) {
        let routeIndex = 0;
        if (selectedRouteType === 'unconventional' && data.routes.length > 1) {
          routeIndex = data.routes.length - 1;
        }

        const routeData = data.routes[routeIndex];
        const coordinates = routeData.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
        setRoute(coordinates);
        setDistance(routeData.distance);
        setDuration(routeData.duration);

        if (selectedRouteType === 'unconventional' && data.routes.length === 1) {
          setError("No unconventional route found. Showing the optimal route instead.");
        }
      } else {
        setError("Could not find a route between these locations.");
      }
    } catch (err) {
      console.error("Routing error:", err);
      setError("Error fetching route. Please try again.");
    }
  };

  const handleFindRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeAddress || !workAddress) {
      setError("Please enter both Home and Work addresses.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setRoute(null);
    setDistance(null);
    setDuration(null);
    
    const home = await geocode(homeAddress);
    if (!home) {
      setError("Could not find the Home address.");
      setLoading(false);
      return;
    }
    
    const work = await geocode(workAddress);
    if (!work) {
      setError("Could not find the Work address.");
      setLoading(false);
      return;
    }
    
    setHomeCoords(home);
    setWorkCoords(work);
    
    await fetchRoute(home, work, mode, routeType);
    setLoading(false);
  };

  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371;
    return `${miles.toFixed(1)} mi`;
  };
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} hr ${mins} min`;
    }
    return `${minutes} min`;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white shadow-xl z-10 flex flex-col h-auto md:h-full overflow-y-auto">
        <div className="p-6 bg-indigo-600 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight">Commuter Hero</h1>
          </div>
          <p className="text-indigo-100 text-sm">Find your optimal daily route</p>
        </div>

        <div className="p-6 flex-grow">
          <form onSubmit={handleFindRoute} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="home" className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Home className="h-5 w-5 text-blue-500" />
                  </div>
                  <input
                    type="text"
                    id="home"
                    value={homeAddress}
                    onChange={(e) => {
                      setHomeAddress(e.target.value);
                      setShowHomeSuggestions(true);
                    }}
                    onFocus={() => setShowHomeSuggestions(true)}
                    className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. 123 Main St, San Francisco"
                  />
                  {homeAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        setHomeAddress('');
                        setHomeCoords(null);
                        setHomeSuggestions([]);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <AnimatePresence>
                    {showHomeSuggestions && homeSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                      >
                        {homeSuggestions.map((s) => (
                          <button
                            key={s.place_id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                            onClick={() => {
                              setHomeAddress(s.display_name);
                              setHomeCoords([parseFloat(s.lat), parseFloat(s.lon)]);
                              setShowHomeSuggestions(false);
                            }}
                          >
                            {s.display_name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative">
                <label htmlFor="work" className="block text-sm font-medium text-slate-700 mb-1">Work Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-red-500" />
                  </div>
                  <input
                    type="text"
                    id="work"
                    value={workAddress}
                    onChange={(e) => {
                      setWorkAddress(e.target.value);
                      setShowWorkSuggestions(true);
                    }}
                    onFocus={() => setShowWorkSuggestions(true)}
                    className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g. 456 Market St, San Francisco"
                  />
                  {workAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        setWorkAddress('');
                        setWorkCoords(null);
                        setWorkSuggestions([]);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <AnimatePresence>
                    {showWorkSuggestions && workSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                      >
                        {workSuggestions.map((s) => (
                          <button
                            key={s.place_id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                            onClick={() => {
                              setWorkAddress(s.display_name);
                              setWorkCoords([parseFloat(s.lat), parseFloat(s.lon)]);
                              setShowWorkSuggestions(false);
                            }}
                          >
                            {s.display_name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Commute Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMode('driving')} className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 border text-sm transition-colors ${mode === 'driving' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <Car size={16}/> Drive
                  </button>
                  <button type="button" onClick={() => setMode('bus')} className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 border text-sm transition-colors ${mode === 'bus' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <Bus size={16}/> Bus
                  </button>
                  <button type="button" onClick={() => setMode('cycling')} className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 border text-sm transition-colors ${mode === 'cycling' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <Bike size={16}/> Bike
                  </button>
                  <button type="button" onClick={() => setMode('walking')} className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 border text-sm transition-colors ${mode === 'walking' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <Footprints size={16}/> Walk
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Route Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setRouteType('optimal')} className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 border text-sm transition-colors ${routeType === 'optimal' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    Optimal
                  </button>
                  <button type="button" onClick={() => setRouteType('unconventional')} className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 border text-sm transition-colors ${routeType === 'unconventional' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    Unconventional
                  </button>
                  <button type="button" onClick={() => setRouteType('random')} className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 border text-sm transition-colors ${routeType === 'random' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <Shuffle size={14}/> Random
                  </button>
                  <button type="button" onClick={() => setRouteType('longest')} className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 border text-sm transition-colors ${routeType === 'longest' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <Maximize size={14}/> Longest
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calculating Route...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {routeType === 'unconventional' ? 'Find Unconventional Route' : 'Find Optimal Route'}
                </span>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {transitOptions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-4"
            >
              <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Bus Routes</h2>
              <div className="space-y-3">
                {transitOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedTransitId(opt.id);
                      setRoute(opt.route);
                      setDistance(opt.distance);
                      setDuration(opt.duration);
                      setWorkAddress(opt.destinationName);
                      setWorkCoords(opt.destinationCoords);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden ${selectedTransitId === opt.id ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    {opt.id === 'multi-transfer' && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> RECOMMENDED
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-900">{opt.name}</span>
                      <span className="text-indigo-600 font-bold">{formatDuration(opt.duration)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{opt.description}</p>
                    <div className="flex gap-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      <span className="flex items-center gap-1"><Shuffle size={10}/> {opt.transfers} Transfers</span>
                      <span className="flex items-center gap-1"><MapPin size={10}/> {opt.stops} Stops</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {route && distance !== null && duration !== null && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 space-y-4"
            >
              <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Trip Summary</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                  <Clock className="w-6 h-6 text-indigo-500 mb-2" />
                  <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Est. Time</span>
                  <span className="text-xl font-bold text-slate-800">{formatDuration(duration)}</span>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                  <RouteIcon className="w-6 h-6 text-indigo-500 mb-2" />
                  <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Distance</span>
                  <span className="text-xl font-bold text-slate-800">{formatDistance(distance)}</span>
                </div>
              </div>

              {mode === 'bus' && selectedTransitId && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Itinerary</h3>
                  <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {transitOptions.find(o => o.id === selectedTransitId)?.legs.map((leg, idx) => (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${leg.type === 'bus' ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">
                              {leg.type === 'bus' ? `Bus ${leg.line}` : 'Walk'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{formatDuration(leg.duration)}</span>
                          </div>
                          <p className="text-xs text-slate-500">{leg.instruction}</p>
                          {leg.stopName && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                              <MapPin size={10} /> {leg.stopName}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm bg-red-500" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">Destination Reached</span>
                        <p className="text-xs text-slate-500">{workAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-grow h-[50vh] md:h-full relative z-0">
        <MapContainer 
          center={defaultCenter} 
          zoom={13} 
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {homeCoords && (
            <Marker position={homeCoords} icon={homeIcon}>
              <Popup>
                <div className="font-semibold">Home</div>
                <div className="text-xs text-slate-500">{homeAddress}</div>
              </Popup>
            </Marker>
          )}
          
          {workCoords && (
            <Marker position={workCoords} icon={workIcon}>
              <Popup>
                <div className="font-semibold">Work</div>
                <div className="text-xs text-slate-500">{workAddress}</div>
              </Popup>
            </Marker>
          )}
          
          {route && (
            <Polyline 
              positions={route} 
              color="#4f46e5" 
              weight={5} 
              opacity={0.8}
              lineCap="round"
              lineJoin="round"
            />
          )}
          
          <MapUpdater homeCoords={homeCoords} workCoords={workCoords} route={route} />
        </MapContainer>
      </div>
    </div>
  );
}
