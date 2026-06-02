/* ==========================================================================
   LDN Field Validator - Navigation, Geodesics & Polygon Analysis Engine
   ========================================================================== */

const NavigationEngine = {
  // Compute distance between two coordinates in meters (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's mean radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Compute absolute bearing from point 1 to point 2 in degrees (0 = North, 90 = East, etc.)
  calculateBearing(lat1, lon1, lat2, lon2) {
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const dLonRad = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(dLonRad) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLonRad);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  },

  // Calculate destination coordinate given start lat/lng, distance in meters, and bearing in degrees
  calculateDestinationPoint(lat, lng, d, bearing) {
    const R = 6371000; // Earth's mean radius in meters
    const brng = bearing * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lng * Math.PI / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d / R) +
      Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
    );
    const lon2 = lon1 + Math.atan2(
      Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
      Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      lat: lat2 * 180 / Math.PI,
      lng: ((lon2 * 180 / Math.PI + 540) % 360) - 180
    };
  },

  // Get cardinal direction string from bearing angle
  getCardinal(bearing) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(bearing / 22.5) % 16;
    return directions[idx];
  },

  // Extract the 4 corner points of a MultiPolygon feature and label them NW, NE, SE, SW
  extractAndClassifyCorners(polygonFeature) {
    let coordinates = [];

    // Parse coordinates based on GeoJSON MultiPolygon or Polygon structure
    if (polygonFeature.geometry.type === 'MultiPolygon') {
      // coordinates structure: [ MultiPolygon [ Polygon [ OuterRing [ Point [lng, lat] ] ] ] ]
      coordinates = polygonFeature.geometry.coordinates[0][0];
    } else if (polygonFeature.geometry.type === 'Polygon') {
      coordinates = polygonFeature.geometry.coordinates[0];
    }

    if (!coordinates || coordinates.length < 4) {
      console.warn('Invalid polygon coordinates for corner extraction', polygonFeature);
      return [];
    }

    // Centroid of the polygon
    const cLng = polygonFeature.properties.location_x;
    const cLat = polygonFeature.properties.location_y;

    // Filter out collinear or duplicate closing points
    // A standard grid cell has exactly 4 distinct corner points
    const uniquePoints = [];
    const seenKeys = new Set();

    coordinates.forEach(coord => {
      const lng = coord[0];
      const lat = coord[1];
      // Keep unique up to 5 decimal places (~1 meter)
      const key = `${lng.toFixed(5)},${lat.toFixed(5)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniquePoints.push({ lng, lat });
      }
    });

    // If there are more/fewer than 4, let's select the 4 extreme nodes
    // NW, NE, SE, SW based on distances to relative boxes
    const corners = {
      NW: null,
      NE: null,
      SE: null,
      SW: null
    };

    // Simple classification:
    // NW: lat > centroid, lng < centroid
    // NE: lat > centroid, lng > centroid
    // SE: lat < centroid, lng > centroid
    // SW: lat < centroid, lng < centroid
    uniquePoints.forEach(pt => {
      const isNorth = pt.lat >= cLat;
      const isEast = pt.lng >= cLng;

      if (isNorth && !isEast) corners.NW = pt;
      else if (isNorth && isEast) corners.NE = pt;
      else if (!isNorth && isEast) corners.SE = pt;
      else if (!isNorth && !isEast) corners.SW = pt;
    });

    // Fallback if some grid cells are slightly rotated and don't fit the simple quadrant rule
    // We sort the points by polar angle relative to the centroid
    if (!corners.NW || !corners.NE || !corners.SE || !corners.SW) {
      const sortedByAngle = uniquePoints
        .map(pt => {
          const angle = Math.atan2(pt.lat - cLat, pt.lng - cLng); // -PI to PI
          return { ...pt, angle };
        })
        .sort((a, b) => a.angle - b.angle); // Counter-clockwise starting from East

      // Angle ranges:
      // ~ -135deg (-2.3 rad) is SW
      // ~ -45deg (-0.7 rad) is SE
      // ~ 45deg (0.7 rad) is NE
      // ~ 135deg (2.3 rad) is NW
      // Sort and assign based on index:
      if (sortedByAngle.length >= 4) {
        corners.SE = sortedByAngle[0]; // ~ -45 deg
        corners.NE = sortedByAngle[1]; // ~ 45 deg
        corners.NW = sortedByAngle[2]; // ~ 135 deg
        corners.SW = sortedByAngle[3]; // ~ -135 deg (around Math.PI / -Math.PI)
      }
    }

    const processCorner = (code, pt, fallbackLat, fallbackLng) => {
      const lat = pt ? pt.lat : fallbackLat;
      const lng = pt ? pt.lng : fallbackLng;
      // Calculate bearing from corner to centroid
      const bearing = this.calculateBearing(lat, lng, cLat, cLng);
      // Offset by 10 meters towards center
      const dest = this.calculateDestinationPoint(lat, lng, 10, bearing);
      return {
        name: `${code} Corner Beacon`,
        code,
        lat,
        lng,
        navLat: dest.lat,
        navLng: dest.lng
      };
    };

    return [
      processCorner('NW', corners.NW, cLat + 0.0003, cLng - 0.0003),
      processCorner('NE', corners.NE, cLat + 0.0003, cLng + 0.0003),
      processCorner('SE', corners.SE, cLat - 0.0003, cLng + 0.0003),
      processCorner('SW', corners.SW, cLat - 0.0003, cLng - 0.0003)
    ];
  },

  // Setup Device Orientation Compass Sensor
  deviceHeading: 0,
  orientationSupported: false,

  initCompassSensor(onHeadingUpdate) {
    const handleOrientation = (event) => {
      this.orientationSupported = true;
      let heading = null;

      // iOS Webkit Compass Heading (true north, extremely stable)
      if (event.webkitCompassHeading !== undefined) {
        heading = event.webkitCompassHeading;
      } 
      // Standard Android Absolute Heading
      else if (event.alpha !== undefined) {
        // Absolute: true if orientation is relative to Earth's coordinate system
        if (event.absolute) {
          heading = 360 - event.alpha; // Convert counter-clockwise alpha to clockwise heading
        } else {
          heading = 360 - event.alpha;
        }
      }

      if (heading !== null) {
        this.deviceHeading = heading;
        onHeadingUpdate(heading);
      }
    };

    // Request permissions for iOS 13+ device orientation
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            window.addEventListener('deviceorientation', handleOrientation, true);
          } else {
            console.warn('Compass DeviceOrientation permission denied.');
            // Fallback: listen anyway
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        })
        .catch(err => console.error('DeviceOrientation permission request error:', err));
    } else {
      // Standard listener (Android, desktop, older iOS)
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }
};
