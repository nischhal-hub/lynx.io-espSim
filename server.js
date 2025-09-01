import dotenv from "dotenv";
import express from "express";
import axios from "axios";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const BACKEND_API = process.env.BACKEND_URL;
const HOST = process.env.HOST || "0.0.0.0";

console.log("Using BACKEND_API:", BACKEND_API);
console.log("Server running on:", `${HOST}:${PORT}`);

app.use(express.json());
app.use(express.static("public")); 

let simulations = {};

function generateFakeGPS(start, end) {
  const lat = start.lat + (Math.random() * (end.lat - start.lat));
  const lng = start.lng + (Math.random() * (end.lng - start.lng));
  const speed = (Math.random() * 60).toFixed(2);
  return { lat: lat, lng: lng, speed: parseFloat(speed) }; 
}

async function sendBatch(deviceId, batch) {
  try {
   
    const batchWithDeviceId = batch.map(point => ({
      ...point,
      deviceId: deviceId
    }));
    
    
    const response = await axios.post(BACKEND_API, batchWithDeviceId);
    console.log(`✅ Uploaded for ${deviceId}:`, response.data);
  } catch (error) {
    console.error(`❌ Upload failed [${deviceId}]:`, error.response?.data || error.message);
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start simulation
app.post("/start", (req, res) => {
  const { devices } = req.body;

  devices.forEach(({ id, startLocation, endLocation }) => {
    let buffer = [];

    const gpsInterval = setInterval(() => {
      const gpsPoint = generateFakeGPS(startLocation, endLocation);
      buffer.push(gpsPoint);
      console.log(`Generated [${id}]`, gpsPoint);
    }, 5000);

    const batchInterval = setInterval(() => {
      if (buffer.length > 0) {
        const batch = [...buffer];
        buffer = [];
        sendBatch(id, batch);
      }
    }, 30000);

    simulations[id] = { gpsInterval, batchInterval };
  });
  res.json({ message: "Simulation started", devices });
});

// Stop simulation
app.post("/stop", (req, res) => {
  const { deviceIds } = req.body;
  deviceIds.forEach((id) => {
    if (simulations[id]) {
      clearInterval(simulations[id].gpsInterval);
      clearInterval(simulations[id].batchInterval);
      delete simulations[id];
      console.log(`🛑 Stopped simulation for ${id}`);
    }
  });
  res.json({ message: "Simulation stopped", devices: deviceIds });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Simulator UI running at http://${HOST}:${PORT}`);
});