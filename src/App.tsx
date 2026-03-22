import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertCircle,
  Bike,
  Briefcase,
  Bus,
  Car,
  Clock3,
  Footprints,
  Home,
  Navigation,
  Route as RouteIcon,
  Shuffle,
  Trophy,
  WandSparkles,
} from 'lucide-react';

type Coordinates = [number, number];
type CommuteMode = 'driving' | 'walking' | 'cycling' | 'bus';
type RoutePlan = 'optimal' | 'random' | 'longest';

type Suggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type OsrmGeometry = {
  coordinates: [number, number][];
};

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: OsrmGeometry;
};

type OsrmResponse = {
  code: string;
  routes: OsrmRoute[];
};

type RouteResult = {
  distance: number;
  duration: number;
  geometry: Coordinates[];
  label: string;
};

type TransitLeg = {
  type: 'walk' | 'bus';
  title: string;
  detail: string;
  duration: number;
};

type BusOption = {
  id: string;
  name: string;
  description: string;
  transfers: number;
  stops: number;
  distance: number;
  duration: number;
  geometry: Coordinates[];
  legs: TransitLeg[];
  recommended: boolean;
};

const DEFAULT_CENTER: Coordinates = [37.7749, -122.4194];

const createPin = (background: string, icon: string) =>
  L.divIcon({
    className: 'commuter-hero-pin',
    html: `<div style="width:36px;height:36px;border-radius:999px;background:${background};border:3px solid #ffffff;box-shadow:0 12px 30px rgba(15,23,42,0.18);display:flex;align-items:center;justify-content:center;color:#ffffff;">${icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const homeIcon = createPin(
  '#2563eb',
  '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"></path><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V9.5"></path></svg>',
);

const workIcon = createPin(
  '#dc2626',
  '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
);

function MapViewport({
  route,
  homeCoords,
  workCoords,
}: {
  route: Coordinates[];
  homeCoords: Coordinates | null;
  workCoords: Coordinates | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: LatLngExpression[] =
      route.length > 0
        ? route
        : [homeCoords, workCoords].filter(Boolean) as Coordinates[];

    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
  }, [homeCoords, map, route, workCoords]);

  return null;
}

function RouletteWheel({ active }: { active: boolean }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!active) {
      setRotation(0);
      return;
    }

    let frameId = 0;
    let velocity = 30;
    let currentRotation = 0;
    let lastTimestamp: number | null = null;

    const tick = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      currentRotation = (currentRotation + velocity * (deltaMs / 16.67)) % 360;
      setRotation(currentRotation);

      velocity = Math.max(1.5, velocity * 0.988);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [active]);

  return (
    <div className="relative h-72 w-72 sm:h-80 sm:w-80">
      <div className="absolute left-1/2 top-[-18px] z-20 h-0 w-0 -translate-x-1/2 border-l-[20px] border-r-[20px] border-t-[34px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-lg" />
      <div
        className="absolute inset-0 rounded-full border-[12px] border-white/20 shadow-[0_0_80px_rgba(15,23,42,0.45)]"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#15803d_0deg_32deg,#111827_32deg_74deg,#b91c1c_74deg_116deg,#111827_116deg_158deg,#b91c1c_158deg_200deg,#111827_200deg_242deg,#b91c1c_242deg_284deg,#111827_284deg_326deg,#b91c1c_326deg_360deg)]" />
        <div className="absolute inset-[16px] rounded-full border-4 border-white/40" />
        <div className="absolute inset-[42px] rounded-full bg-slate-950/20" />
        <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-slate-900 shadow-lg" />
        <div className="absolute left-1/2 top-5 h-[calc(50%-2.25rem)] w-1 -translate-x-1/2 rounded-full bg-white/85" />
        <div className="absolute bottom-5 left-1/2 h-[calc(50%-2.25rem)] w-1 -translate-x-1/2 rounded-full bg-white/85" />
        <div className="absolute left-5 top-1/2 h-1 w-[calc(50%-2.25rem)] -translate-y-1/2 rounded-full bg-white/85" />
        <div className="absolute right-5 top-1/2 h-1 w-[calc(50%-2.25rem)] -translate-y-1/2 rounded-full bg-white/85" />
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes} min`;
}

function formatDistance(meters: number) {
  const miles = meters * 0.000621371;
  return `${miles.toFixed(1)} mi`;
}

function buildNominatimUrl(query: string, limit: number) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  return url.toString();
}

async function fetchSuggestions(query: string) {
  const response = await fetch(buildNominatimUrl(query, 5), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Address suggestions are unavailable right now.');
  }

  return (await response.json()) as Suggestion[];
}

async function geocodeAddress(address: string) {
  const response = await fetch(buildNominatimUrl(address, 1), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Unable to geocode address.');
  }

  const results = (await response.json()) as Suggestion[];
  if (!results.length) {
    return null;
  }

  return {
    coords: [Number(results[0].lat), Number(results[0].lon)] as Coordinates,
    label: results[0].display_name,
  };
}

function toGeometry(route: OsrmRoute) {
  return route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as Coordinates);
}

async function requestOsrmRoute(
  profile: 'driving' | 'foot' | 'bike',
  points: Coordinates[],
  alternatives = false,
) {
  const coords = points.map(([lat, lon]) => `${lon},${lat}`).join(';');
  const url = new URL(`https://router.project-osrm.org/route/v1/${profile}/${coords}`);
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  if (alternatives) {
    url.searchParams.set('alternatives', 'true');
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Routing service is unavailable.');
  }

  const data = (await response.json()) as OsrmResponse;
  if (data.code !== 'Ok' || !data.routes.length) {
    throw new Error('No route found for the selected commute.');
  }

  return data.routes;
}

function offsetPoint(start: Coordinates, end: Coordinates, ratio: number, offsetScale: number) {
  const lat = start[0] + (end[0] - start[0]) * ratio;
  const lon = start[1] + (end[1] - start[1]) * ratio;
  const latDiff = end[0] - start[0];
  const lonDiff = end[1] - start[1];
  const length = Math.max(Math.sqrt(latDiff * latDiff + lonDiff * lonDiff), 0.01);
  const normalLat = -lonDiff / length;
  const normalLon = latDiff / length;

  return [lat + normalLat * offsetScale, lon + normalLon * offsetScale] as Coordinates;
}

function scoreRecommendedBus(option: BusOption) {
  return option.duration - option.transfers * 240 - option.stops * 18;
}

function buildBusLegs(optionName: string, transfers: number, duration: number) {
  const walkIn = Math.min(8 * 60, Math.max(4 * 60, duration * 0.08));
  const transferWalk = transfers > 0 ? Math.round(duration * 0.05) : 0;
  const finalWalk = Math.min(7 * 60, Math.max(3 * 60, duration * 0.06));
  const busSegments = transfers + 1;
  const busTime = Math.max(duration - walkIn - transferWalk * transfers - finalWalk, 8 * 60);
  const perSegment = Math.round(busTime / busSegments);
  const legs: TransitLeg[] = [
    {
      type: 'walk',
      title: 'Walk to first stop',
      detail: 'Head to the nearest inbound stop.',
      duration: walkIn,
    },
  ];

  for (let index = 0; index < busSegments; index += 1) {
    const segmentNumber = index + 1;
    legs.push({
      type: 'bus',
      title: `Ride ${optionName} segment ${segmentNumber}`,
      detail:
        index === busSegments - 1
          ? 'Stay on until the final stop near work.'
          : 'Ride to the transfer hub and switch lines.',
      duration: perSegment,
    });

    if (index < busSegments - 1) {
      legs.push({
        type: 'walk',
        title: `Transfer ${segmentNumber}`,
        detail: 'Move to the next platform or curbside bay.',
        duration: transferWalk,
      });
    }
  }

  legs.push({
    type: 'walk',
    title: 'Walk to destination',
    detail: 'Finish the last short walk to work.',
    duration: finalWalk,
  });

  return legs;
}

async function buildStandardRoute(start: Coordinates, end: Coordinates, mode: Exclude<CommuteMode, 'bus'>, plan: RoutePlan) {
  const profile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'driving';

  if (plan === 'optimal') {
    const [best] = await requestOsrmRoute(profile, [start, end], true);
    return {
      distance: best.distance,
      duration: best.duration,
      geometry: toGeometry(best),
      label: 'Optimal route',
    } satisfies RouteResult;
  }

  const candidatePointSets: Coordinates[][] = [];

  if (plan === 'random') {
    for (let index = 0; index < 6; index += 1) {
      const first = offsetPoint(start, end, 0.25 + Math.random() * 0.25, (Math.random() - 0.5) * 0.45);
      const second = offsetPoint(start, end, 0.6 + Math.random() * 0.2, (Math.random() - 0.5) * 0.55);
      candidatePointSets.push([start, first, second, end]);
    }
  }

  if (plan === 'longest') {
    candidatePointSets.push(
      [start, offsetPoint(start, end, 0.35, 0.55), offsetPoint(start, end, 0.72, -0.65), end],
      [start, offsetPoint(start, end, 0.22, -0.7), offsetPoint(start, end, 0.58, 0.8), end],
      [start, offsetPoint(start, end, 0.42, 0.95), offsetPoint(start, end, 0.8, 0.55), end],
    );
  }

  const settled = await Promise.allSettled(
    candidatePointSets.map(async (points) => {
      const [route] = await requestOsrmRoute(profile, points, false);
      return {
        distance: route.distance,
        duration: route.duration,
        geometry: toGeometry(route),
        label: plan === 'random' ? 'Randomized route' : 'Longest available detour',
      } satisfies RouteResult;
    }),
  );

  const routes = settled
    .filter((result): result is PromiseFulfilledResult<RouteResult> => result.status === 'fulfilled')
    .map((result) => result.value);

  if (!routes.length) {
    const [fallback] = await requestOsrmRoute(profile, [start, end], true);
    return {
      distance: fallback.distance,
      duration: fallback.duration,
      geometry: toGeometry(fallback),
      label: 'Fallback route',
    } satisfies RouteResult;
  }

  if (plan === 'random') {
    return routes[Math.floor(Math.random() * routes.length)];
  }

  return routes.reduce((longest, current) => (current.distance > longest.distance ? current : longest));
}

async function buildBusOptions(start: Coordinates, end: Coordinates) {
  const directPromise = requestOsrmRoute('driving', [start, end], true);
  const northPromise = requestOsrmRoute('driving', [start, offsetPoint(start, end, 0.42, 0.18), end]);
  const southPromise = requestOsrmRoute('driving', [start, offsetPoint(start, end, 0.55, -0.2), end]);
  const crosstownPromise = requestOsrmRoute('driving', [start, offsetPoint(start, end, 0.3, -0.12), offsetPoint(start, end, 0.76, 0.18), end]);

  const results = await Promise.allSettled([directPromise, northPromise, southPromise, crosstownPromise]);
  const routes = results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<OsrmRoute[]> => result.status === 'fulfilled' && result.value.length > 0,
    )
    .map((result) => result.value[0]);

  if (!routes.length) {
    throw new Error('No bus-style route options could be generated.');
  }

  const seed = routes[0];
  const candidateSeeds = [
    {
      id: 'express',
      name: 'Express 101',
      description: 'Few stops and minimal transfers. Best when you want the straightest transit corridor.',
      transfers: 0,
      stops: 7,
      route: seed,
      durationMultiplier: 1.18,
      distanceMultiplier: 1.02,
    },
    {
      id: 'connector',
      name: 'Connector Blue + Green',
      description: 'More transfers, but it prioritizes faster corridors and can beat traffic despite extra stops.',
      transfers: 2,
      stops: 14,
      route: routes[1] ?? seed,
      durationMultiplier: 0.94,
      distanceMultiplier: 1.08,
    },
    {
      id: 'crosstown',
      name: 'Crosstown Local',
      description: 'Broader stop coverage with a mid-route transfer through busy neighborhoods.',
      transfers: 1,
      stops: 18,
      route: routes[2] ?? seed,
      durationMultiplier: 1.08,
      distanceMultiplier: 1.12,
    },
    {
      id: 'metro',
      name: 'Metro Link Stack',
      description: 'A long transfer-heavy path that leans on multiple bus lanes and dedicated transit segments.',
      transfers: 3,
      stops: 21,
      route: routes[3] ?? routes[1] ?? seed,
      durationMultiplier: 0.97,
      distanceMultiplier: 1.16,
    },
  ];

  const options = candidateSeeds.map((candidate) => {
    const distance = candidate.route.distance * candidate.distanceMultiplier;
    const duration = candidate.route.duration * candidate.durationMultiplier;

    return {
      id: candidate.id,
      name: candidate.name,
      description: candidate.description,
      transfers: candidate.transfers,
      stops: candidate.stops,
      distance,
      duration,
      geometry: toGeometry(candidate.route),
      legs: buildBusLegs(candidate.name, candidate.transfers, duration),
      recommended: false,
    } satisfies BusOption;
  });

  const transferFriendly = options.filter((option) => option.transfers >= 1);
  const recommendedPool = transferFriendly.length ? transferFriendly : options;
  const recommended = recommendedPool.reduce((best, current) =>
    scoreRecommendedBus(current) < scoreRecommendedBus(best) ? current : best,
  );

  return options.map((option) => ({
    ...option,
    recommended: option.id === recommended.id,
  }));
}

export default function App() {
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [homeCoords, setHomeCoords] = useState<Coordinates | null>(null);
  const [workCoords, setWorkCoords] = useState<Coordinates | null>(null);
  const [mode, setMode] = useState<CommuteMode>('driving');
  const [plan, setPlan] = useState<RoutePlan>('optimal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [busOptions, setBusOptions] = useState<BusOption[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [homeSuggestions, setHomeSuggestions] = useState<Suggestion[]>([]);
  const [workSuggestions, setWorkSuggestions] = useState<Suggestion[]>([]);
  const [showHomeSuggestions, setShowHomeSuggestions] = useState(false);
  const [showWorkSuggestions, setShowWorkSuggestions] = useState(false);
  const homeDebounceRef = useRef<number | null>(null);
  const workDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (homeDebounceRef.current) {
        window.clearTimeout(homeDebounceRef.current);
      }
      if (workDebounceRef.current) {
        window.clearTimeout(workDebounceRef.current);
      }
    };
  }, []);

  const queueSuggestions = (
    query: string,
    type: 'home' | 'work',
    setSuggestions: (items: Suggestion[]) => void,
  ) => {
    const debounceRef = type === 'home' ? homeDebounceRef : workDebounceRef;

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        const items = await fetchSuggestions(query.trim());
        setSuggestions(items);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  };

  const selectSuggestion = (suggestion: Suggestion, type: 'home' | 'work') => {
    const coords = [Number(suggestion.lat), Number(suggestion.lon)] as Coordinates;

    if (type === 'home') {
      setHomeAddress(suggestion.display_name);
      setHomeCoords(coords);
      setHomeSuggestions([]);
      setShowHomeSuggestions(false);
      return;
    }

    setWorkAddress(suggestion.display_name);
    setWorkCoords(coords);
    setWorkSuggestions([]);
    setShowWorkSuggestions(false);
  };

  const resetResults = () => {
    setError(null);
    setActiveRoute(null);
    setBusOptions([]);
    setSelectedBusId(null);
  };

  const resolveCoordinates = async () => {
    const resolvedHome =
      homeCoords && homeAddress.trim()
        ? { coords: homeCoords, label: homeAddress.trim() }
        : await geocodeAddress(homeAddress.trim());
    const resolvedWork =
      workCoords && workAddress.trim()
        ? { coords: workCoords, label: workAddress.trim() }
        : await geocodeAddress(workAddress.trim());

    if (!resolvedHome) {
      throw new Error('Home address could not be found.');
    }

    if (!resolvedWork) {
      throw new Error('Work address could not be found.');
    }

    setHomeAddress(resolvedHome.label);
    setWorkAddress(resolvedWork.label);
    setHomeCoords(resolvedHome.coords);
    setWorkCoords(resolvedWork.coords);

    return {
      start: resolvedHome.coords,
      end: resolvedWork.coords,
    };
  };

  const handleFindRoute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!homeAddress.trim() || !workAddress.trim()) {
      setError('Enter both a home and work address before calculating a route.');
      return;
    }

    setLoading(true);
    resetResults();

    try {
      const { start, end } = await resolveCoordinates();

      if (mode === 'bus') {
        const options = await buildBusOptions(start, end);
        const recommended = options.find((option) => option.recommended) ?? options[0];
        setBusOptions(options);
        setSelectedBusId(recommended.id);
        setActiveRoute({
          distance: recommended.distance,
          duration: recommended.duration,
          geometry: recommended.geometry,
          label: `${recommended.name} recommended`,
        });
      } else {
        const route = await buildStandardRoute(start, end, mode, plan);
        setActiveRoute(route);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to calculate the requested route.');
    } finally {
      setLoading(false);
    }
  };

  const selectedBus = busOptions.find((option) => option.id === selectedBusId) ?? null;
  const currentGeometry = selectedBus ? selectedBus.geometry : activeRoute?.geometry ?? [];
  const summaryDistance = selectedBus ? selectedBus.distance : activeRoute?.distance ?? null;
  const summaryDuration = selectedBus ? selectedBus.duration : activeRoute?.duration ?? null;
  const showRouletteOverlay = loading && mode !== 'bus' && plan === 'random';

  return (
    <div className="h-screen w-full bg-slate-100 text-slate-900">
      {showRouletteOverlay && (
        <div className="pointer-events-none fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6">
            <RouletteWheel active={showRouletteOverlay} />
            <div className="rounded-full bg-white/10 px-5 py-2 text-center text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-lg">
              Spinning up a wild route...
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full flex-col md:flex-row">
        <aside className="z-[1000] flex w-full flex-col overflow-y-auto border-b border-slate-200 bg-white shadow-2xl md:h-full md:w-[420px] md:border-b-0 md:border-r">
          <div className="bg-[linear-gradient(135deg,#0f172a_0%,#0f3d54_52%,#129990_100%)] px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
                <Navigation className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Commuter Hero</h1>
                <p className="text-sm text-cyan-50/90">
                  Daily commute planning with smart routing, bus options, and detour modes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6 p-6">
            <form className="space-y-6" onSubmit={handleFindRoute}>
              <div className="space-y-4">
                <div className="relative">
                  <label htmlFor="home" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Home address
                  </label>
                  <div className="relative">
                    <Home className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-blue-600" />
                    <input
                      id="home"
                      value={homeAddress}
                      onChange={(event) => {
                        setHomeAddress(event.target.value);
                        setHomeCoords(null);
                        setShowHomeSuggestions(true);
                        queueSuggestions(event.target.value, 'home', setHomeSuggestions);
                      }}
                      onFocus={() => setShowHomeSuggestions(true)}
                      onBlur={() => window.setTimeout(() => setShowHomeSuggestions(false), 120)}
                      className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="Enter your starting point"
                    />
                  </div>

                  {showHomeSuggestions && homeSuggestions.length > 0 && (
                    <div className="absolute z-[1200] mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                      {homeSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.place_id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectSuggestion(suggestion, 'home')}
                          className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          {suggestion.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label htmlFor="work" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Work address
                  </label>
                  <div className="relative">
                    <Briefcase className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-rose-600" />
                    <input
                      id="work"
                      value={workAddress}
                      onChange={(event) => {
                        setWorkAddress(event.target.value);
                        setWorkCoords(null);
                        setShowWorkSuggestions(true);
                        queueSuggestions(event.target.value, 'work', setWorkSuggestions);
                      }}
                      onFocus={() => setShowWorkSuggestions(true)}
                      onBlur={() => window.setTimeout(() => setShowWorkSuggestions(false), 120)}
                      className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      placeholder="Enter your destination"
                    />
                  </div>

                  {showWorkSuggestions && workSuggestions.length > 0 && (
                    <div className="absolute z-[1200] mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                      {workSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.place_id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectSuggestion(suggestion, 'work')}
                          className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          {suggestion.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Commute mode
                  </h2>
                  <span className="text-xs text-slate-400">OSM + OSRM</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['driving', 'Drive', Car],
                    ['walking', 'Walk', Footprints],
                    ['cycling', 'Bike', Bike],
                    ['bus', 'Bus', Bus],
                  ].map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value as CommuteMode)}
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                        mode === value
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Route plan
                  </h2>
                  <span className="text-xs text-slate-400">
                    {mode === 'bus' ? 'Bus mode uses route set generation' : 'Choose how adventurous the trip gets'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {[
                    ['optimal', 'Optimal', RouteIcon],
                    ['random', 'Randomizer', Shuffle],
                    ['longest', 'Longest Path', WandSparkles],
                  ].map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={mode === 'bus'}
                      onClick={() => setPlan(value as RoutePlan)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        plan === value && mode !== 'bus'
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      } ${mode === 'bus' ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {value === 'optimal'
                          ? 'Fastest default'
                          : value === 'random'
                            ? 'Any valid detour'
                            : 'Maximum detour'}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Navigation className="h-4 w-4" />
                {loading ? 'Calculating route...' : 'Find Optimal Route'}
              </button>
            </form>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            {summaryDistance !== null && summaryDuration !== null && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Trip summary
                  </h2>
                  <span className="text-xs text-slate-400">
                    {selectedBus ? selectedBus.name : activeRoute?.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <Clock3 className="mb-3 h-5 w-5 text-cyan-700" />
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Estimated time</div>
                    <div className="mt-1 text-2xl font-semibold">{formatDuration(summaryDuration)}</div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <RouteIcon className="mb-3 h-5 w-5 text-cyan-700" />
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Distance</div>
                    <div className="mt-1 text-2xl font-semibold">{formatDistance(summaryDistance)}</div>
                  </div>
                </div>
              </section>
            )}

            {mode === 'bus' && busOptions.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Bus routes
                  </h2>
                  <span className="text-xs text-slate-400">MVP route-set estimates</span>
                </div>

                <div className="space-y-3">
                  {busOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedBusId(option.id);
                        setActiveRoute({
                          distance: option.distance,
                          duration: option.duration,
                          geometry: option.geometry,
                          label: option.name,
                        });
                      }}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        selectedBusId === option.id
                          ? 'border-cyan-600 bg-cyan-50 shadow-lg shadow-cyan-100'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{option.name}</span>
                            {option.recommended && (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{option.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">{formatDuration(option.duration)}</div>
                          <div className="text-xs text-slate-400">{formatDistance(option.distance)}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                          {option.transfers} transfers
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                          {option.stops} stops
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedBus && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <Trophy className="h-4 w-4" />
                      Bus itinerary
                    </div>
                    <div className="space-y-3">
                      {selectedBus.legs.map((leg, index) => (
                        <div key={`${leg.title}-${index}`} className="rounded-2xl bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-slate-900">{leg.title}</span>
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {formatDuration(leg.duration)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{leg.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </aside>

        <main className="relative h-[48vh] flex-1 md:h-full">
          <MapContainer center={DEFAULT_CENTER} zoom={12} className="h-full w-full" zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {homeCoords && (
              <Marker position={homeCoords} icon={homeIcon}>
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">Home</div>
                    <div className="text-xs text-slate-600">{homeAddress}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {workCoords && (
              <Marker position={workCoords} icon={workIcon}>
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">Work</div>
                    <div className="text-xs text-slate-600">{workAddress}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {currentGeometry.length > 0 && (
              <Polyline
                positions={currentGeometry}
                pathOptions={{
                  color: mode === 'bus' ? '#0f766e' : '#0284c7',
                  weight: 6,
                  opacity: 0.88,
                }}
              />
            )}

            <MapViewport route={currentGeometry} homeCoords={homeCoords} workCoords={workCoords} />
          </MapContainer>
        </main>
      </div>
    </div>
  );
}
