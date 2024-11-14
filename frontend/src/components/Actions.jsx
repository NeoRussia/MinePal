import React from "react";
import "./Actions.css";

function Actions({
  agentStarted,
  toggleAgent,
  settings,
  setSettings
}) {
  const handleLanguageChange = (event) => {
    setSettings(prevSettings => ({ ...prevSettings, language: event.target.value }));
  };

  return (
    <div className="actions">
      <div className="language-settings">
        <span htmlFor="language">Language/Accent:</span>
        <select
          id="language"
          value={settings.language}
          onChange={handleLanguageChange}
          disabled={agentStarted} // Disable when agentStarted is true
        >
          <option value="bg">Bulgarian</option>
          <option value="ca">Catalan</option>
          <option value="zh">Chinese (Mandarin)</option>
          <option value="zh-CN">Chinese (Mandarin, China)</option>
          <option value="zh-TW">Chinese (Mandarin, Taiwan)</option>
          <option value="cs">Czech</option>
          <option value="da">Danish</option>
          <option value="da-DK">Danish (Denmark)</option>
          <option value="nl">Dutch</option>
          <option value="en">English</option>
          <option value="en-US">English (US)</option>
          <option value="en-AU">English (Australia)</option>
          <option value="en-GB">English (UK)</option>
          <option value="en-NZ">English (New Zealand)</option>
          <option value="en-IN">English (India)</option>
          <option value="et">Estonian</option>
          <option value="fi">Finnish</option>
          <option value="nl-BE">Flemish (Belgium)</option>
          <option value="fr">French</option>
          <option value="fr-CA">French (Canada)</option>
          <option value="de">German</option>
          <option value="de-CH">German (Switzerland)</option>
          <option value="el">Greek</option>
          <option value="hi">Hindi</option>
          <option value="hu">Hungarian</option>
          <option value="id">Indonesian</option>
          <option value="it">Italian</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="ko-KR">Korean (South Korea)</option>
          <option value="lv">Latvian</option>
          <option value="lt">Lithuanian</option>
          <option value="ms">Malay</option>
          <option value="multi">Multilingual (Spanish + English)</option>
          <option value="no">Norwegian</option>
          <option value="pl">Polish</option>
          <option value="pt">Portuguese</option>
          <option value="pt-BR">Portuguese (Brazil)</option>
          <option value="ro">Romanian</option>
          <option value="ru">Russian</option>
          <option value="sk">Slovak</option>
          <option value="es">Spanish</option>
          <option value="es-419">Spanish (Latin America)</option>
          <option value="sv">Swedish</option>
          <option value="sv-SE">Swedish (Sweden)</option>
          <option value="th">Thai</option>
          <option value="th-TH">Thai (Thailand)</option>
          <option value="tr">Turkish</option>
          <option value="uk">Ukrainian</option>
          <option value="vi">Vietnamese</option>
        </select>
      </div>
      <button className="action-button" onClick={toggleAgent}>
        {agentStarted ? "Stop Bot" : "Start Bot"}
      </button>
    </div>
  );
}

export default Actions;