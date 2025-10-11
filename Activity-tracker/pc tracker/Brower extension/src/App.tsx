import React, { useState, useEffect } from "react";

const ChromeProfileSelector: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<number | null>(null);
  const [savedProfile, setSavedProfile] = useState<number | null>(null);

  useEffect(() => {
    // Get stored profile from chrome.storage.local
    chrome.storage.local.get("chrome_profile", (res: { chrome_profile?: string }) => {
      if (res.chrome_profile) setSavedProfile(Number(res.chrome_profile));
    });
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProfile) return alert("Select one option");
    chrome.storage.local.set({ chrome_profile: selectedProfile.toString() }, () => {
      setSavedProfile(selectedProfile);
      setTimeout(() => window.close(), 700);
    });
  };

  if (savedProfile) {
    return <p>Profile {savedProfile} already set.</p>;
  }

  return (
    <div style={{ fontFamily: "Arial", padding: "20px" }}>
      <h3>Select Chrome Profile</h3>
      <form onSubmit={handleSubmit}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ margin: "8px 0" }}>
            <label>
              <input
                type="radio"
                name="profile"
                value={i + 1}
                checked={selectedProfile === i + 1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSelectedProfile(Number(e.target.value))
                }
              />{" "}
              Chrome Profile {i + 1}
            </label>
          </div>
        ))}
        <button type="submit" style={{ marginTop: "10px", padding: "6px 12px" }}>
          Save
        </button>
      </form>
    </div>
  );
};

export default ChromeProfileSelector;
