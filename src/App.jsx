import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; // Adjust path if your firebase file is in a folder
import Login from "./pages/loginscreen"; // The file we just fixed

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  

  // This "Watcher" detects if a user is logged in or not
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup the listener
  }, []);

  // Show a simple black screen while checking the login status
  if (loading) {
    return <div style={{ backgroundColor: '#000', height: '100vh' }} />;
  }

  return (
    <div className="App">
      {/* If there is no user, show the Login screen.
          If there IS a user, show the Main AI Interface.
      */}
      {!user ? (
        <Login />
      ) : (
        <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>
          <h1>Welcome, {user.displayName}</h1>
          <p>MALVIN AI is ready.</p>
          
          <button 
            onClick={() => auth.signOut()}
            style={{ marginTop: '20px', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default App;