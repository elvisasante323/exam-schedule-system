import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  GoogleMap,
  InfoWindow,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { getExams } from "../utils/api";
import { getStatusLabel, STATUS_ORDER } from "../utils/status";

const STATUS_MARKER_COLORS = {
  pending: "#d97706",
  started: "#0891b2",
  finished: "#64748b",
};

function getMarkerIcon(status) {
  const color =
    STATUS_MARKER_COLORS[status] || STATUS_MARKER_COLORS.finished;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <path fill="${color}" stroke="#ffffff" stroke-width="2"
        d="M18 2C10.3 2 4 8.3 4 16c0 11.5 14 29.5 14 29.5S32 27.5 32 16C32 8.3 25.7 2 18 2z"/>
      <circle cx="18" cy="16" r="5.5" fill="#ffffff"/>
    </svg>
  `.trim();

  const icon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  };

  if (typeof window !== "undefined" && window.google?.maps) {
    icon.scaledSize = new window.google.maps.Size(28, 38);
    icon.anchor = new window.google.maps.Point(14, 38);
  }

  return icon;
}

const mapStyle = [
  {
    elementType: "geometry",
    stylers: [
      {
        color: "#212121",
      },
    ],
  },
  {
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#212121",
      },
    ],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9e9e9e",
      },
    ],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#bdbdbd",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#181818",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#1b1b1b",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#2c2c2c",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#8a8a8a",
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [
      {
        color: "#373737",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#3c3c3c",
      },
    ],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [
      {
        color: "#4e4e4e",
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#3d3d3d",
      },
    ],
  },
];

const defaultCenter = {
  lat: 53.796,
  lng: -1.566,
};

const googleMapsApiKey = (process.env.REACT_APP_GOOGLE_MAP_API || "").trim();
const hasGoogleMapsApiKey = Boolean(googleMapsApiKey);

function getSessionPosition(session) {
  const lat = parseFloat(session?.location?.latitude);
  const lng = parseFloat(session?.location?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

/** Fan out markers that share the same coordinates so each status pin is visible. */
function spreadOverlappingPositions(entries) {
  const groups = new Map();

  entries.forEach((entry) => {
    const key = `${entry.position.lat.toFixed(5)},${entry.position.lng.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  const result = [];
  groups.forEach((group) => {
    if (group.length === 1) {
      result.push(group[0]);
      return;
    }

    group.forEach((entry, index) => {
      const angle = (2 * Math.PI * index) / group.length - Math.PI / 2;
      const radius = 0.04 + Math.floor(index / 8) * 0.02;
      result.push({
        ...entry,
        position: {
          lat: entry.position.lat + Math.cos(angle) * radius,
          lng: entry.position.lng + Math.sin(angle) * radius,
        },
      });
    });
  });

  return result;
}

function fitMapToMarkers(map, positions) {
  if (!map || !positions.length || typeof window === "undefined" || !window.google) {
    return;
  }

  if (positions.length === 1) {
    map.setCenter(positions[0]);
    map.setZoom(8);
    return;
  }

  const bounds = new window.google.maps.LatLngBounds();
  positions.forEach((position) => bounds.extend(position));
  map.fitBounds(bounds);
}

function PageHeader() {
  return (
    <div className="PageHeader">
      <div>
        <p className="PageEyebrow">Exam locations</p>
        <h2>Map</h2>
      </div>
      <div className="ViewSwitch" aria-label="Schedule views">
        <Link to="/sessions">List</Link>
        <span className="is-active">Map</span>
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <ul className="MapLegend" aria-label="Marker status legend">
      {STATUS_ORDER.map((status) => (
        <li key={status}>
          <span
            className={`StatusDot StatusDot--${status}`}
            aria-hidden="true"
          />
          {getStatusLabel(status)}
        </li>
      ))}
    </ul>
  );
}

function ExamMapCanvas({ mappableSessions }) {
  const [map, setMap] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey,
  });

  const selectedEntry = useMemo(
    () =>
      mappableSessions.find(
        ({ session }) => session.id === selectedSessionId
      ) || null,
    [mappableSessions, selectedSessionId]
  );

  useEffect(() => {
    if (!map) return;
    fitMapToMarkers(
      map,
      mappableSessions.map(({ position }) => position)
    );
  }, [map, mappableSessions]);

  const onLoad = React.useCallback((nextMap) => {
    setMap(nextMap);
  }, []);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <p className="ErrorState" role="alert">
        Unable to load Google Maps. Check that your API key is valid and that
        the Maps JavaScript API is enabled.
      </p>
    );
  }

  if (!isLoaded) {
    return <p className="LoadingState">Loading map...</p>;
  }

  if (mappableSessions.length === 0) {
    return (
      <p className="EmptyState">No exam locations with coordinates to show.</p>
    );
  }

  return (
    <div className="MapCanvas">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        options={{ styles: mapStyle, disableDefaultUI: true }}
        center={defaultCenter}
        zoom={8}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={() => setSelectedSessionId(null)}
      >
        {mappableSessions.map(({ session, position }) => {
          const country = session.location?.country || "Unknown location";
          const status = session.status || "pending";
          const statusLabel = getStatusLabel(status);
          const tooltip = `${session.title} · ${country} · ${statusLabel}`;

          return (
            <Marker
              key={session.id}
              position={position}
              icon={getMarkerIcon(status)}
              title={tooltip}
              onClick={() => setSelectedSessionId(session.id)}
            />
          );
        })}

        {selectedEntry && (
          <InfoWindow
            position={selectedEntry.position}
            onCloseClick={() => setSelectedSessionId(null)}
          >
            <div className="MapInfoWindow">
              <strong>{selectedEntry.session.title}</strong>
              <p>
                {selectedEntry.session.location?.country || "Unknown location"}
              </p>
              <p className="MapInfoStatus">
                <span
                  className={`StatusDot StatusDot--${
                    ["pending", "started", "finished"].includes(
                      selectedEntry.session.status
                    )
                      ? selectedEntry.session.status
                      : "finished"
                  }`}
                />
                {getStatusLabel(selectedEntry.session.status)}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

function ExamMap() {
  const [examSessions, setExamSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getExams()
      .then((examSessionsData) => {
        if (!cancelled) {
          setExamSessions(
            Array.isArray(examSessionsData) ? examSessionsData : []
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load exam locations. Please try again.");
          setExamSessions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const mappableSessions = useMemo(() => {
    const positioned = examSessions
      .map((session) => {
        const position = getSessionPosition(session);
        if (!position) return null;
        return { session, position };
      })
      .filter(Boolean);

    return spreadOverlappingPositions(positioned);
  }, [examSessions]);

  if (!hasGoogleMapsApiKey) {
    return (
      <main className="GoogleMap">
        <PageHeader />
        <div className="EmptyState MapFallback" role="status">
          <p>
            Google Maps is unavailable because{" "}
            <code>REACT_APP_GOOGLE_MAP_API</code> is not set.
          </p>
          <p>
            Add your Maps JavaScript API key to <code>.env</code> (see{" "}
            <code>.env.example</code>), then restart the app.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="GoogleMap">
        <PageHeader />
        <p className="LoadingState">Loading exam locations...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="GoogleMap">
        <PageHeader />
        <p className="ErrorState" role="alert">
          {error}
        </p>
      </main>
    );
  }

  return (
    <main className="GoogleMap">
      <PageHeader />
      <MapLegend />
      <ExamMapCanvas mappableSessions={mappableSessions} />
    </main>
  );
}

export default React.memo(ExamMap);
