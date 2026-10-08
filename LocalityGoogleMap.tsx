import React, { useState, useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  MapPin,
  Navigation,
  Footprints,
  Maximize2,
  Minimize2,
  Volume2,
  Sparkles,
  Layers,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { MovementTelemetry } from '../services/movementTrackingService';
import { elevenLabsVoiceManager } from '../services/elevenLabsService';
import { hapticFeedback } from '../utils/haptics';

export interface LocalityWaypoint {
  id: string;
  name: string;
  category: 'Canopy' | 'Botanical' | 'Geo' | 'Fauna';
  description: string;
  audioPrompt: string;
  lat: number;
  lng: number;
  icon: string;
  completed: boolean;
  distanceMeters: number;
  bearingDegrees?: number;
}

interface LocalityGoogleMapProps {
  telemetry: MovementTelemetry;
  activeWaypoint: LocalityWaypoint | null;
  waypoints: LocalityWaypoint[];
  onSelectWaypoint: (waypoint: LocalityWaypoint) => void;
  onWaypointCompleted: (waypointId: string) => void;
}

// Dark Wilderness Tactical Map Style
const DARK_WILDERNESS_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#161d19' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111714' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#88998d' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4ade80' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6ee7b7' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1a3325' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#34d399' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27332c' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#18241e' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca3af' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2e4236' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2d25' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f242b' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
];

// Helper to pan map smoothly when user moves
const MapCenterFollower: React.FC<{
  center: { lat: number; lng: number };
  isFollowEnabled: boolean;
}> = ({ center, isFollowEnabled }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !isFollowEnabled) return;
    map.panTo(center);
  }, [map, center.lat, center.lng, isFollowEnabled]);

  return null;
};

export const LocalityGoogleMap: React.FC<LocalityGoogleMapProps> = ({
  telemetry,
  activeWaypoint,
  waypoints,
  onSelectWaypoint,
  onWaypointCompleted,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [selectedPin, setSelectedPin] = useState<LocalityWaypoint | null>(null);
  const [isFollowMode, setIsFollowMode] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const userPosition = useMemo(
    () => ({
      lat: telemetry.latitude,
      lng: telemetry.longitude,
    }),
    [telemetry.latitude, telemetry.longitude]
  );

  const handleSpeakWaypoint = (wp: LocalityWaypoint, e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback.buttonPress();
    elevenLabsVoiceManager.speak(
      `Waypoint objective: ${wp.name}. ${wp.description}. Distance is ${wp.distanceMeters} meters away.`,
      {
        voiceId: elevenLabsVoiceManager.getSelectedVoiceId(),
      }
    );
  };

  if (!apiKey) {
    return (
      <div className="p-6 rounded-2xl bg-stone-950 border border-stone-800 text-center text-stone-400 font-mono text-xs">
        <MapPin className="w-8 h-8 mx-auto mb-2 text-amber-500 animate-pulse" />
        <p className="text-stone-200 font-bold mb-1">GOOGLE MAPS INITIALIZING</p>
        <p>Awaiting Maps API key configuration for locality positioning.</p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-[#0d1413] shadow-2xl transition-all duration-300 flex flex-col ${
        isExpanded ? 'h-[620px] ring-2 ring-emerald-500/50' : 'h-[380px] sm:h-[420px]'
      }`}
    >
      {/* Top Tactical Map Header */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>LOCALITY RADAR</span>
          </div>
          <span className="text-stone-600">|</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              telemetry.state === 'MOVING'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {telemetry.state === 'MOVING'
              ? `MOVING · ${telemetry.speedMps} M/S`
              : `AT REST (${telemetry.timeAtRestSeconds}s)`}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onClick={() => {
              hapticFeedback.tactileClick();
              setIsFollowMode(!isFollowMode);
            }}
            title={isFollowMode ? 'Auto-centering GPS active' : 'Click to re-center on player'}
            className={`px-2.5 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5 backdrop-blur-md transition-all ${
              isFollowMode
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-black/80 border-stone-700 text-stone-400 hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GPS Lock</span>
          </button>

          <button
            onClick={() => {
              hapticFeedback.tactileClick();
              setIsExpanded(!isExpanded);
            }}
            className="w-8 h-8 rounded-xl bg-black/80 hover:bg-neutral-800 border border-stone-700 text-stone-300 hover:text-white flex items-center justify-center backdrop-blur-md transition-all"
            aria-label={isExpanded ? 'Minimize map' : 'Expand map'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Google Maps Container */}
      <div className="flex-1 w-full h-full relative">
        <APIProvider apiKey={apiKey}>
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={userPosition}
            defaultZoom={17}
            minZoom={14}
            maxZoom={20}
            gestureHandling="greedy"
            disableDefaultUI={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            styles={DARK_WILDERNESS_STYLES}
            className="w-full h-full"
          >
            <MapCenterFollower center={userPosition} isFollowEnabled={isFollowMode} />

            {/* User Real-Time Position Marker */}
            <AdvancedMarker position={userPosition} title="Your Current Position">
              <div className="relative flex items-center justify-center">
                {/* Outer pulsing acoustic sonar ring */}
                <span className="absolute w-12 h-12 rounded-full bg-emerald-500/20 animate-ping" />
                <span className="absolute w-8 h-8 rounded-full bg-emerald-500/40 animate-pulse" />
                {/* Core Player Avatar */}
                <div
                  className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_12px_rgba(52,211,153,0.9)] flex items-center justify-center text-white"
                  style={{
                    transform: `rotate(${telemetry.headingDegrees || 0}deg)`,
                  }}
                >
                  <Navigation className="w-4 h-4 fill-white" />
                </div>
              </div>
            </AdvancedMarker>

            {/* Localized Exploration Waypoints */}
            {waypoints.map((wp) => {
              const isActive = activeWaypoint?.id === wp.id;

              return (
                <AdvancedMarker
                  key={wp.id}
                  position={{ lat: wp.lat, lng: wp.lng }}
                  onClick={() => {
                    hapticFeedback.tactileClick();
                    setSelectedPin(wp);
                    onSelectWaypoint(wp);
                  }}
                  title={wp.name}
                >
                  <div
                    className={`relative cursor-pointer transition-transform hover:scale-110 ${
                      isActive ? 'scale-110 z-20' : 'z-10'
                    }`}
                  >
                    <div
                      className={`px-2 py-1 rounded-xl flex items-center gap-1.5 shadow-lg font-mono text-xs border ${
                        wp.completed
                          ? 'bg-stone-900/90 border-stone-700 text-stone-400'
                          : isActive
                          ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/50'
                          : 'bg-black/90 border-stone-600 text-white'
                      }`}
                    >
                      <span className="text-sm select-none">{wp.icon}</span>
                      <span className="font-bold text-[11px] truncate max-w-[90px]">
                        {wp.name}
                      </span>
                      {wp.completed && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    </div>

                    {/* Ground target beacon pin */}
                    <div className="w-1.5 h-3 mx-auto bg-emerald-400 rounded-b-full shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Waypoint Info Window */}
            {selectedPin && (
              <InfoWindow
                position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
                onCloseClick={() => setSelectedPin(null)}
              >
                <div className="p-1 max-w-[220px] text-stone-900 font-sans">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 mb-1">
                    <span>{selectedPin.icon}</span>
                    <span>{selectedPin.name}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 mb-2 leading-relaxed">
                    {selectedPin.description}
                  </p>
                  <div className="flex items-center justify-between gap-2 border-t pt-2 text-[10px] font-mono text-stone-500">
                    <span>{selectedPin.distanceMeters}m away</span>
                    <button
                      onClick={(e) => handleSpeakWaypoint(selectedPin, e)}
                      className="px-2 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Audio</span>
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Bottom Locality Navigation Bar */}
      <div className="p-3 bg-black/90 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-stone-300">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">
              {activeWaypoint ? `${activeWaypoint.name}` : 'Free Roam Locality'}
            </span>
          </div>
          {activeWaypoint && (
            <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              {activeWaypoint.distanceMeters}m AHEAD
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeWaypoint) {
                hapticFeedback.missionComplete();
                onWaypointCompleted(activeWaypoint.id);
                elevenLabsVoiceManager.speak(
                  `Objective ${activeWaypoint.name} completed! Great observation, Scout. Marking waypoint complete.`,
                  { voiceId: elevenLabsVoiceManager.getSelectedVoiceId() }
                );
              }
            }}
            disabled={!activeWaypoint || activeWaypoint.completed}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeWaypoint && !activeWaypoint.completed
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black active:scale-95 shadow-md shadow-emerald-950/50'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark Arrived</span>
          </button>
        </div>
      </div>
    </div>
  );
};
