import { useState, useEffect } from 'react';
import axios from 'axios';
import mixpanel from 'mixpanel-browser';
import './App.css';
import Settings from './components/Settings';
import Actions from './components/Actions';

mixpanel.init('a9bdd5c85dab5761be032f1c1650defa');

const api = axios.create({
  baseURL: LOCAL_BE_HOST
});

const openai_api = axios.create({
  baseURL: "https://api.openai.com/v1"
});

function App() {
  const [settings, setSettings] = useState({
    minecraft_version: "",
    host: "",
    port: "",
    player_username: "",
    profiles: [],
    whisper_to_player: false,
    language: 'en',
    openai_api_key: ''
  });

  const [error, setError] = useState(null);
  const [agentStarted, setAgentStarted] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);

  const handleProfileSelect = (profile) => {
    setSelectedProfiles(prev => 
      prev.includes(profile) ? prev.filter(p => p !== profile) : [...prev, profile]
    );
    console.log("selected", selectedProfiles);
  };

  const handleSettingChange = (key, value) => {
    setSettings(prevSettings => ({ ...prevSettings, [key]: value }));
  };

  const settingNotes = {
    minecraft_version: "supports up to 1.20.4",
    host: "or \"localhost\", \"your.ip.address.here\"",
    port: "default is 25565",
    player_username: "your Minecraft username",
    openai_api_key: "i.e. sk-..."
  }

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      const expectedFields = Object.keys(settings);
      const filteredSettings = Object.fromEntries(
        Object.entries(response.data).filter(([key]) => expectedFields.includes(key))
      );

      // Filter profiles to only include name and personality fields
      if (filteredSettings.profiles) {
        filteredSettings.profiles = filteredSettings.profiles.map(profile => ({
          name: profile.name,
          personality: profile.personality
        }));
      }

      setSettings(prevSettings => ({ ...prevSettings, ...filteredSettings }));
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setError("Failed to load settings.");
      throw err;
    }
  };

  const fetchAgentStatus = async () => {
    try {
      const response = await api.get('/agent-status');
      setAgentStarted(response.data.agentStarted);
    } catch (err) {
      console.error("Failed to fetch agent status:", err);
      setError("Failed to load agent status.");
      throw err;
    }
  };

  const checkServerAlive = async (host, port) => {
    try {
        const response = await api.get('/check-server', { params: { host, port } });
        return response.data.alive;
    } catch (error) {
        console.error("Server ping failed:", error);
        return false;
    }
  };

  const checkOpenAIApiKeyValidity = async (openai_api_key) => {
    try {
        const response = await openai_api.get('/models', {
          headers: {
            'Authorization': `Bearer ${openai_api_key}`
          }
        });
        if (response.status === 200) {
          return true;
        } else {
          console.error("The OpenAI API key is invalid or an error occurred.", error);
          return false;
        }
    } catch (error) {
        console.error("The OpenAI API key is invalid or an error occurred.", error);
        return false;
    }
  };

  const toggleAgent = async () => {
    if (agentStarted) {
      try {
        const response = await api.post('/stop', {});
        console.log("Agent stopped successfully:", response.data);
        setAgentStarted(false);
        setError(null); // Clear errors on success

        // Track the "Bot play time" event
        if (startTime) {
          const playTime = (Date.now() - startTime) / 1000; // in seconds
          mixpanel.track('Bot play time', {
            distinct_id: settings.player_username,
            play_time: playTime
          });
          setStartTime(null);
        }
      } catch (error) {
        console.error("Failed to stop agent:", error);
        setError(error.response?.data || error.message || "An unknown error occurred while stopping the agent.");
      }
    } else {
      const emptyFields = Object.entries(settings)
        .filter(([key, value]) => {
          if (key === 'profiles') return value.length === 0;
          if (typeof value === 'string') return value.trim() === '';
          if (Array.isArray(value)) return value.length === 0;
          return value === null || value === undefined;
        })
        .map(([key]) => key);

      if (emptyFields.length > 0) {
        setError(`Please fill in the following fields: ${emptyFields.join(', ')}`);
        return;
      }

      if (!isValidMinecraftUsername(settings.player_username)) {
        setError("Invalid Minecraft username. It should be 3-16 characters long and can only contain letters, numbers, and underscores.");
        return;
      }

      const invalidProfileNames = selectedProfiles.filter(profile => !isValidMinecraftUsername(profile.name));
      if (invalidProfileNames.length > 0) {
          setError(`Invalid profile names: ${invalidProfileNames.map(profile => profile.name).join(', ')}. They should be 3-16 characters long and can only contain letters, numbers, and underscores.`);
          return;
      }

      if (selectedProfiles.length === 0) {
        setError("Please select at least one pal to play with.");
        return;
      }

      const serverAlive = await checkServerAlive(settings.host, settings.port);
      if (!serverAlive) {
        setError("The Minecraft server is not reachable. Please check the host and port.");
        return;
      }

      const isValidaOpenAIApiKey = await checkOpenAIApiKeyValidity(settings.openai_api_key);
      if (!isValidaOpenAIApiKey) {
        setError("The OpenAI API key is invalid or an error occurred.");
        return;
      }

      try {
        const filteredSettings = {
          ...settings,
          profiles: selectedProfiles // Only send selected profiles
        };
        const response = await api.post('/start', filteredSettings);
        console.log("Agent started successfully:", response.data);
        setAgentStarted(true);
        setError(null); // Clear errors on success

        // Identify the user in Mixpanel
        mixpanel.identify(settings.player_username);

        // Track the number of bots spawned
        mixpanel.track('Bots spawned', {
          distinct_id: settings.player_username,
          bot_count: selectedProfiles.length
        });

        // Set the start time for tracking
        setStartTime(Date.now());
      } catch (error) {
        console.error("Failed to start agent:", error);
        setError(error.response?.data || error.message || "An unknown error occurred while starting the agent.");
      }
    }
  };

  const isValidMinecraftUsername = (username) => {
    const regex = /^[a-zA-Z0-9_]{3,16}$/;
    return regex.test(username);
  };

  const handleBeforeUnload = (event) => {
    // This might not work lol, because we're an Electron app, but just gonna have this here first.
    
    if (agentStarted) {
      const playTime = (Date.now() - startTime) / 1000; // in seconds
      mixpanel.track('Bot play time', {
        distinct_id: settings.player_username,
        play_time: playTime
      });
    }
  };

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [agentStarted, startTime]);

  useEffect(() => {
    const fetchDataWithRetry = async () => {
      const startTime = Date.now();
      const timeoutDuration = 5000;

      while (Date.now() - startTime < timeoutDuration) {
        try {
          await fetchSettings();
          await fetchAgentStatus();
          await fetchBackendAlive();
          setError(null);
          break; // Exit loop if all fetches succeed
        } catch (err) {
          console.error("Fetch failed, retrying...", err);
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retrying
        }
      }

      setLoading(false);
    };

    fetchDataWithRetry();
  }, []);

  if (loading) {
    return <div className="spinner">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>MinePal Control Panel</h1>
      <Settings
        settings={settings}
        setSettings={setSettings}
        settingNotes={settingNotes}
        selectedProfiles={selectedProfiles}
        handleProfileSelect={handleProfileSelect}
        handleSettingChange={handleSettingChange}
        api={api}
      />
      <Actions
        agentStarted={agentStarted}
        toggleAgent={toggleAgent}
        settings={settings}
        setSettings={setSettings}
      />
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default App;