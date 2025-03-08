import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Canvas } from "@react-three/fiber";
import { Quaternion, Euler } from "three";
import './App.css';

function App() {
  const [keyPressed, setKeyPressed] = useState("");
  const [responseData, setResponseData] = useState("");
  const [imuData, setImuData] = useState({ roll: 0, pitch: 0, yaw: 0, temperature: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [controllerConnected, setControllerConnected] = useState(false);
  const [controllerData, setControllerData] = useState({ buttons: [], axes: [] });
  const [pressedButtons, setPressedButtons] = useState([]);
  const [lastSentControllerData, setLastSentControllerData] = useState({ buttons: [], axes: [] });
  const [controllerDataSentTime, setControllerDataSentTime] = useState(0);
  const [keyAlreadySent, setKeyAlreadySent] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [batteryData, setBatteryData] = useState({ voltage: 0, percentage: 0 });
  const [servoData, setServoData] = useState({
    hipLeg1: 0, hipLeg2: 0, hipLeg3: 0, hipLeg4: 0, shoulderLeg1: 0, shoulderLeg2: 0, shoulderLeg3: 0,
    shoulderLeg4: 0, kneeLeg1: 0, kneeLeg2: 0, kneeLeg3: 0, kneeLeg4: 0 });
  const [runTime, setRunTime] = useState(0);

  const esp32KeyUrl = useMemo(() => `http://${ipAddress}/sendKey`, [ipAddress]);
  const esp32ImuUrl = useMemo(() => `http://${ipAddress}/getIMU`, [ipAddress]);
  const esp32ControllerUrl = useMemo(() => `http://${ipAddress}/sendControllerData`, [ipAddress]);
  const esp32BatteryUrl = useMemo(() => `http://${ipAddress}/getBattery`, [ipAddress]);
  const esp32ServoUrl = useMemo(() => `http://${ipAddress}/getServo`, [ipAddress]);

  const buttonNames = useMemo(() => ({
    0: "A", 1: "B", 2: "X", 3: "Y", 4: "LB", 5: "RB", 6: "LT", 7: "RT", 8: "View", 9: "Menu",
    10: "Left Stick", 11: "Right Stick", 12: "Up", 13: "Down", 14: "Left", 15: "Right",
  }), []);

  const handleIpAddressChange = (event) => {
    setIpAddress(event.target.value);
  };

  const handleIpSubmit = (event) => {
    event.preventDefault(); // Prevents the page from reloading on form submission
    checkConnection(); // Calls the function to check connection with the entered IP
  };

  const checkConnection = useCallback(() => {
    axios.get(esp32ImuUrl)
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));
  }, [esp32ImuUrl]);

  const sendDataToESP32 = useCallback((data) => {
    const currentTime = Date.now();

    // Check if at least 50ms have passed since the last send
    if (currentTime - controllerDataSentTime >= 50) {
      axios.post(esp32KeyUrl, data, { headers: { "Content-Type": "text/plain" } })
        .then(response => setResponseData(response.data))
        .catch(error => {
          console.error("Error sending data to ESP32:", error);
          setResponseData("Error communicating with ESP32");
        });

      // Update the last sent time
      setControllerDataSentTime(currentTime);
    }
  }, [esp32KeyUrl, controllerDataSentTime]);


  const sendControllerDataToESP32 = useCallback(() => {
    const currentTime = Date.now();
    if (currentTime - controllerDataSentTime >= 50) {
      const dataToSend = {
        buttons: controllerData.buttons.map(button => button.pressed ? 1 : 0),
        axes: controllerData.axes
      };
      if (JSON.stringify(dataToSend) !== JSON.stringify(lastSentControllerData)) {
        axios.post(esp32ControllerUrl, dataToSend, { headers: { "Content-Type": "text/plain" } })
          .then(response => console.log("Controller data sent:", response.data))
          .catch(error => console.error("Error sending controller data:", error));

        setLastSentControllerData(dataToSend);
        setControllerDataSentTime(currentTime);
      }
    }
  }, [controllerData, esp32ControllerUrl, controllerDataSentTime, lastSentControllerData]);

  const fetchIMUData = useCallback(() => {
    axios.get(esp32ImuUrl)
      .then(response => {
        const data = response.data;
        if (data?.roll !== undefined && data?.pitch !== undefined && data?.yaw !== undefined && 
          data?.temperature !== undefined) {
          setImuData({
            roll: parseFloat(data.roll),
            pitch: parseFloat(data.pitch),
            yaw: parseFloat(data.yaw),
            temperature: parseFloat(data.temperature),
          });
        }
      })
      .catch(error => console.error("Error fetching IMU data from ESP32:", error));
  }, [esp32ImuUrl]);

  const fetchBatteryData = useCallback(() => {
    axios.get(esp32BatteryUrl)
      .then(response => {
        const data = response.data;
        if (data?.voltage !== undefined && data?.percentage !== undefined) {
          setBatteryData({
            voltage: parseFloat(data.voltage),
            percentage: parseInt(data.percentage, 10),
          });
        }
      })
      .catch(error => console.error("Error fetching battery data from ESP32:", error));
  }, [esp32BatteryUrl]);

  const fetchServoData = useCallback(() => {
    axios.get(esp32ServoUrl)
      .then(response => {
        const data = response.data;
        if (data?.hipLeg1 !== undefined && data?.hipLeg2 !== undefined && data?.hipLeg3 !== undefined 
          && data?.hipLeg4 !== undefined &&
            data?.shoulderLeg1 !== undefined && data?.shoulderLeg2 !== undefined && data?.shoulderLeg3
             !== undefined && data?.shoulderLeg4 !== undefined &&
            data?.kneeLeg1 !== undefined && data?.kneeLeg2 !== undefined && data?.kneeLeg3 !== undefined
             && data?.kneeLeg4 !== undefined) {
          setServoData({
            hipLeg1: parseFloat(data.hipLeg1),
            hipLeg2: parseFloat(data.hipLeg2),
            hipLeg3: parseFloat(data.hipLeg3),
            hipLeg4: parseFloat(data.hipLeg4),
            shoulderLeg1: parseFloat(data.shoulderLeg1),
            shoulderLeg2: parseFloat(data.shoulderLeg2),
            shoulderLeg3: parseFloat(data.shoulderLeg3),
            shoulderLeg4: parseFloat(data.shoulderLeg4),
            kneeLeg1: parseFloat(data.kneeLeg1),
            kneeLeg2: parseFloat(data.kneeLeg2),
            kneeLeg3: parseFloat(data.kneeLeg3),
            kneeLeg4: parseFloat(data.kneeLeg4),
          });
        }
      })
      .catch(error => console.error("Error fetching servo data from ESP32:", error));
  }, [esp32ServoUrl]);

  useEffect(() => {
    const batteryInterval = setInterval(fetchBatteryData, 5000); // Update every 5 seconds
    return () => clearInterval(batteryInterval);
  }, [fetchBatteryData]);

  useEffect(() => {
    const servoInterval = setInterval(fetchServoData, 100); // Update every 5 seconds
    return () => clearInterval(servoInterval);
  }, [fetchServoData]);

  useEffect(() => {
    if (controllerConnected) {
      sendControllerDataToESP32();
    }
  }, [controllerData, controllerConnected, sendControllerDataToESP32]);

  useEffect(() => {
    const connectionInterval = setInterval(checkConnection, 3000);
    const imuInterval = setInterval(fetchIMUData, 50);
    return () => {
      clearInterval(connectionInterval);
      clearInterval(imuInterval);
    };
  }, [checkConnection, fetchIMUData]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key;
      if (!keyAlreadySent) {
        setKeyPressed(key);
        sendDataToESP32(key);
        setKeyAlreadySent(true);
      }
    };

    const handleKeyUp = () => {
      if (keyAlreadySent) {
        sendDataToESP32("None");
        setKeyPressed("");
        setKeyAlreadySent(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [keyAlreadySent, sendDataToESP32]);

  const handleGamepadConnected = useCallback(() => {
    setControllerConnected(true);
    pollGamepad();
  }, []);

  const handleGamepadDisconnected = useCallback(() => {
    setControllerConnected(false);
  }, []);

  const pollGamepad = useCallback(() => {
    const gamepad = navigator.getGamepads()[0];
    if (gamepad) {
      setControllerData({
        buttons: gamepad.buttons.map((button, index) => ({ index, pressed: button.pressed })),
        axes: gamepad.axes.map((axis, index) => ({ index, value: axis.toFixed(3) })),
      });
    }
    requestAnimationFrame(pollGamepad);
  }, []); // Make sure any dependencies used inside this function are listed here


  useEffect(() => {
    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
    };
  }, [handleGamepadConnected, handleGamepadDisconnected, pollGamepad]); // Include pollGamepad here


  useEffect(() => {
    if (controllerConnected) {
      const newPressedButtons = controllerData.buttons
        .filter(({ pressed }) => pressed)
        .map(({ index }) => `Button ${buttonNames[index] || `Button ${index}`}`);
      setPressedButtons(newPressedButtons);
    }
  }, [controllerData, controllerConnected, buttonNames]);

  const buttonPressedText = pressedButtons.length > 0
    ? pressedButtons.length === 1
      ? `${pressedButtons[0]} is pressed`
      : pressedButtons.join(" and ") + " are pressed"
    : "None";

  // Box component with quaternion-based rotation
  const Box = ({ roll, pitch, yaw }) => {
    // Convert roll, pitch, yaw to radians and apply to quaternion
    const quaternion = useMemo(() => {
      const euler = new Euler(
        (pitch * Math.PI) / 180, // Convert pitch to radians
        (yaw * Math.PI) / 180,   // Convert yaw to radians
        (roll * Math.PI) / 180,  // Convert roll to radians
        "YXZ"                    // Set order to avoid gimbal lock
      );
      return new Quaternion().setFromEuler(euler);
    }, [roll, pitch, yaw]);

    return (
      <mesh quaternion={quaternion}>
        <boxGeometry args={[3, 0.75, 5]} />
        <meshStandardMaterial color="rgba(133, 128, 177, 1)" />
      </mesh>
    );
  };

  const renderResponseData = (data) => typeof data === "object" ? JSON.stringify(data) : data;

  const handleResetYawPress = () => sendDataToESP32("ResetYawTrue");
  const handleResetYawRelease = () => sendDataToESP32("ResetYawFalse");

  // Timer effect
  useEffect(() => {
    let timer;

    if (isConnected) {
      timer = setInterval(() => {
        setRunTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      setRunTime(0);
    }

    return () => clearInterval(timer); // Cleanup timer on disconnection or unmount
  }, [isConnected]);

  // Format run time as HH:MM:SS
  const formatRunTime = () => {
    const hours = String(Math.floor(runTime / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((runTime % 3600) / 60)).padStart(2, "0");
    const seconds = String(runTime % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    const interval = setInterval(checkConnection, 5000); // Check connection every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [checkConnection]);

                
return (
  <div className="App">
    <header className="App-header">
      <div className="header-left">
        <h1>DogBot UI</h1>
      </div>
      <div className="header-right">
        <div className="connect-status">
          <form onSubmit={handleIpSubmit} className="ip-form">
            <input
              type="text"
              value={ipAddress}
              onChange={handleIpAddressChange}
              placeholder="Enter ESP32 IP"
              className="ip-input"
            />
            <button type="submit" className="enter-button">Enter</button>
          </form>
          <h2>Status: {isConnected ? "Connected" : "Not Connected"}</h2>
        </div>
      </div>
    </header>

    <div className="main-content">
      <div className="camera-box">
        <div className="camera-label">Back Camera Stream</div>
        <iframe
          src="http://192.168.1.114/web/admin.html"
          width="100%"
          height="100%"
          style={{ border: "none" }}
          title="Camera 1 Stream"
        ></iframe>
      </div>

      <div className="camera-box">
        <div className="camera-label">Front Camera Stream</div>
        <iframe
          src="http://192.168.1.137/web/admin.html"
          width="100%"
          height="100%"
          style={{ border: "none" }}
          title="Camera 2 Stream"
        ></iframe>
      </div>

      <div className="object-box">
        <button
          onMouseDown={handleResetYawPress}
          onMouseUp={handleResetYawRelease}
          className="reset-yaw-button"
        >
          Reset Yaw
        </button>
        <Canvas style={{ height: "100%", width: "100%" }}>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          <Box roll={imuData.roll} pitch={imuData.pitch} yaw={imuData.yaw} />
        </Canvas>
        <div className="imu-label">
          IMU Data: Roll: {imuData.roll.toFixed(2)}° | Pitch: {imuData.pitch.toFixed(2)}° | 
          Yaw: {imuData.yaw.toFixed(2)}°
        </div>
      </div>

      <div className="status-box">
        <h3>Controller Info</h3>
        <div className="key-pressed">Key Pressed: {keyPressed || "None"}</div>
        <div className="ESP32-response">
          ESP32 Response: {renderResponseData(responseData)}
        </div>
        <div>Controller Status: {controllerConnected ? "Connected" : "Not Connected"}</div>
        <div>Controller Buttons Pressed: {buttonPressedText}</div>
        <div className="controller-axis-data">
          <div>Axis LX: {controllerData.axes[0]?.value}</div>
          <div>Axis LY: {controllerData.axes[1]?.value}</div>
          <div>Axis RX: {controllerData.axes[2]?.value}</div>
          <div>Axis RY: {controllerData.axes[3]?.value}</div>
        </div>
      </div>

      <div className="robot-info-box">
        <h3>Robot Info</h3>
        <p>Temperature: {imuData.temperature.toFixed(2)} °C</p>
        {/* <p>Battery Voltage: {batteryData.voltage.toFixed(2)}V</p>
        <p>Battery Percentage: {batteryData.percentage}%</p> */}
        <p>Battery Voltage: 12.3 V</p>
        <p>Battery Percentage: 91.6 %</p>
        <p>Run time: {isConnected ? formatRunTime() : "Disconnected"}</p>
      </div>

      <div className="servo-data-box">
        <h3>Servo Data</h3>
        <div>Hip Leg 1: {servoData.hipLeg1}°</div>
        <div>Shoulder Leg 1: {servoData.shoulderLeg1}°</div>
        <div>Knee Leg 1: {servoData.kneeLeg1}°</div>
        <div>Hip Leg 2: {servoData.hipLeg2}°</div>
        <div>Shoulder Leg 2: {servoData.shoulderLeg2}°</div>
        <div>Knee Leg 2: {servoData.kneeLeg2}°</div>
        <div>Hip Leg 3: {servoData.hipLeg3}°</div>
        <div>Shoulder Leg 3: {servoData.shoulderLeg3}°</div>
        <div>Knee Leg 3: {servoData.kneeLeg3}°</div>
        <div>Hip Leg 4: {servoData.hipLeg4}°</div>
        <div>Shoulder Leg 4: {servoData.shoulderLeg4}°</div>
        <div>Knee Leg 4: {servoData.kneeLeg4}°</div>
      </div>
    </div>
  </div>
);
}

export default App;