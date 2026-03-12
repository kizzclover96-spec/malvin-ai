interface WelcomeProps {
  onWakeClick: () => void;
  isConnecting: boolean;
}

function Welcomeview({ onWakeClick, isConnecting }: WelcomeProps) {
  return (
    <div className="welcome">
      <div className="ai-picture-container" style={{ textAlign: 'center' }}>
        <img 
          src="/Malvin self.png" // Removed ../public/ - use / for the public folder
          alt="Your personal ai assistant" 
          style={{ 
            height: "250px", 
            width: "250px", 
            borderRadius: "50%", 
            objectFit: "cover"   
          }}
        /> 
        
        <div className="welcome-overlay">
          <p>Ask Malvin anything!</p>
        </div>

        <button 
          style={{ 
            height: "40px", 
            width: "150px", 
            borderRadius: "17px", 
            backgroundColor: isConnecting ? "#555" : "#0070f3", // Changes color when loading
            color: "white",
            border: "none",
            cursor: isConnecting ? "not-allowed" : "pointer",
            marginTop: "20px"
          }}
          // Change this from onButtonClick to onWakeClick
          onClick={onWakeClick} 
          disabled={isConnecting}
        >
          {isConnecting ? "Waking Malvin..." : "Wake Malvin"}
        </button>
      </div>
    </div>
  )
}

export default Welcomeview;