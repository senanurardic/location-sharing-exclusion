// ============================
// CALIBRATED MAP CONFIGURATION (ZOOM 16.0)
// ============================
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    // Symmetrically calculated center matching your custom KML geometry bounds
    center: [9.2123, 45.4824], 
    zoom: 13.0,                
    minZoom: 13.0,             
    maxZoom: 13.0,             
    
    // EXPERIMENTAL CONTROLS: FIXED VIEWPORT MATRIX
    dragPan: false,            
    doubleClickZoom: false,    
    boxZoom: false,            
    keyboard: false,           
    touchZoomRotate: false,    
    
    pixelRatio: window.devicePixelRatio || 2 
});

// ============================
// GREEN-GREY MAP DESATURATION FILTER
// ============================
map.on('style.load', () => {
    const mapCanvas = map.getCanvas();
    mapCanvas.style.filter = 'grayscale(0.6) contrast(1.1) brightness(0.95) hue-rotate(25deg)';
});

// ============================
// EXACT EXTRACTED KML COORDINATE NODES
// ============================
const positions = {
    leftNode:  [9.203801, 45.483950], // Top-Left Vertex ("G") 
    rightNode: [9.216763, 45.486383], // Top-Right Vertex ("M") 
    mainNode:  [9.217046, 45.476790]  // Main Bottom Vertex (Blue Pulse) 
};

// ============================
// EXPERIMENT SUBJECTS CONFIGURATION
// ============================
const people = [
    {
        id: "leftNode",
        markerType: "grey-letter-dot",
        initial: "G"
    },
    {
        id: "rightNode",
        markerType: "grey-letter-dot",
        initial: "M"
    },
    {
        id: "mainNode",
        markerType: "blue-pulse-dot"
    }
];

// ============================
// MARKER RENDER ENGINE
// ============================
function createMarkerElement(person) {
    const clusterEl = document.createElement("div");
    clusterEl.className = "marker-cluster";

    const agentEl = document.createElement("div");
    agentEl.className = "agent-node";

    if (person.markerType === "blue-pulse-dot") {
        const mapsDotContainer = document.createElement("div");
        mapsDotContainer.className = "google-maps-dot-container";

        const breathingPulse = document.createElement("div");
        breathingPulse.className = "google-maps-pulse";

        const solidCore = document.createElement("div");
        solidCore.className = "google-maps-core";

        mapsDotContainer.appendChild(breathingPulse);
        mapsDotContainer.appendChild(solidCore);
        agentEl.appendChild(mapsDotContainer);
    } 
    else if (person.markerType === "grey-letter-dot") {
        const greyDot = document.createElement("div");
        greyDot.className = "experimental-grey-letter-dot";
        greyDot.textContent = person.initial;
        agentEl.appendChild(greyDot);
    }

    clusterEl.appendChild(agentEl);
    return clusterEl;
}

// Marker nesnelerini referans olarak tutmak için obje
const markerInstances = {};

function initMarkers() {
    people.forEach(person => {
        const marker = new maplibregl.Marker({
            element: createMarkerElement(person),
            anchor: "center"
        })
        .setLngLat(positions[person.id])
        .addTo(map);

        // Hareket ettireceğimiz marker'ları saklıyoruz
        markerInstances[person.id] = marker;
    });
}

// Render stationary configuration fields immediately
initMarkers();

// ============================
// TIMED LINEAR INTERPOLATION ENGINE
// ============================
const DELAY_DURATION = 10 * 1000;      // 10 saniye bekleme süresi
const MOVE_DURATION = 120 * 1000;     // 120 saniye saf hareket süresi
let startTime = null;

// G ve M başlangıç noktaları
const startG = positions.leftNode;
const startM = positions.rightNode;

// Tam orta nokta (Buluşma noktası)
const midLng = (startG[0] + startM[0]) / 2;
const midLat = (startG[1] + startM[1]) / 2;

// Çakışmayı (Overlap) önlemek için duracakları nihai hedefler
const offsetPercent = 0.04; 
const deltaLng = startM[0] - startG[0];
const deltaLat = startM[1] - startG[1];

const targetG = [midLng - (deltaLng * offsetPercent), midLat - (deltaLat * offsetPercent)];
const targetM = [midLng + (deltaLng * offsetPercent), midLat + (deltaLat * offsetPercent)];

function animateNodes(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    let progress = 0;

    if (elapsed < DELAY_DURATION) {
        // İlk 10 saniye: Hareket yok, başlangıç noktalarındalar
        progress = 0;
    } else {
        // 10. saniyeden sonra: Hareket başlar, ilerleme 120 saniyeye oranlanır
        const moveElapsed = elapsed - DELAY_DURATION;
        progress = Math.min(moveElapsed / MOVE_DURATION, 1);
    }

    // Doğrusal enterpolasyon (LERP) ile konum hesaplama
    const currentG_Lng = startG[0] + (targetG[0] - startG[0]) * progress;
    const currentG_Lat = startG[1] + (targetG[1] - startG[1]) * progress;

    const currentM_Lng = startM[0] + (targetM[0] - startM[0]) * progress;
    const currentM_Lat = startM[1] + (targetM[1] - startM[1]) * progress;

    // Harita üzerindeki konumları güncelle
    if (markerInstances["leftNode"]) {
        markerInstances["leftNode"].setLngLat([currentG_Lng, currentG_Lat]);
    }
    if (markerInstances["rightNode"]) {
        markerInstances["rightNode"].setLngLat([currentM_Lng, currentM_Lat]);
    }

    // Toplam süre (10s + 120s) dolmadıysa animasyona devam et
    if (elapsed < (DELAY_DURATION + MOVE_DURATION)) {
        requestAnimationFrame(animateNodes);
    }
}

// Animasyonu harita yüklenince tetikle
map.on('load', () => {
    requestAnimationFrame(animateNodes);
});