import React from "react";
import ImageCycler from "./ImageCycler";
import { glassPanel } from "../styles/glass";

interface Activity {
    id: number;
    text: string;
    icon: string;
    time: string;
}

interface ActivityPanelProps {
    activities: Activity[];
}

const ActivityPanel = ({ activities }: ActivityPanelProps) => {
    return (
        <div>
            <div className="Right-top panel" style={{ width: '200px', height: '100px', 
                    borderRight: '1px solid rgba(255, 255, 255, 0.1)', // Subtle white line
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    ...glassPanel
                }}>

            </div>
            {/* button right section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="activities-panel" style={{ 
                    padding: '20px', 
                    minHeight: '120px',
                    maxHeight: '400px', // Prevents it from taking over the whole screen
                    overflowY: 'auto',   // Adds scrollbar when history gets long
                    display: 'flex',
                    flexDirection: 'column',
                    ...glassPanel,
                    scrollbarWidth: 'none' // Hides scrollbar for a cleaner look (Firefox)
                }}>
                    <p style={{ color: 'white', margin: '0 0 15px 0', fontWeight: '400', opacity: 0.6, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Activity Log
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activities.map((item) => (
                            <div key={item.id} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                animation: 'fadeIn 0.3s ease-out' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                    <span style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>{item.text}</span>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="Right-panel" style={{ flex: 2, padding: '15px', height: '100px', minHeight: '300px',
                    flexDirection: 'column', 
                    display: 'flex',
                    ...glassPanel
                }}> 
                <p style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px', paddingLeft: '5px' }}>
                    GALLERIA
                </p>
                {/* THE CYCLER GOES HERE */}
                <div style={{ flex: 1, height: '300px', width: '100%', borderRadius: '14px', overflow: 'hidden', position: 'relative' }}>
                    <ImageCycler interval={4000} /> 
                </div>
            </div> 
        </div>
    )
}
export default ActivityPanel;