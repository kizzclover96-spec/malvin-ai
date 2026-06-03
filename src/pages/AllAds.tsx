import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue, update, remove } from "firebase/database";

const AllAds = () => {
    const [ads, setAds] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("ALL");

    useEffect(() => {
        const adsRef = ref(db, "admin/approved_ads");

        const unsubscribe = onValue(adsRef, (snapshot) => {
            const data = snapshot.val();

            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));

                setAds(list.reverse());
            } else {
                setAds([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const markPosted = async (ad: any) => {
        try {
            await update(
                ref(db, `admin/approved_ads/${ad.id}`),
                {
                    postingStatus: "Posted",
                    postedAt: Date.now()
                }
            );

            alert("AD_MARKED_POSTED");
        } catch (err) {
            console.error(err);
        }
    };
    const filteredAds = ads.filter((ad) => {
        const search = searchTerm.toLowerCase();

        const matchesSearch =
            ad.title?.toLowerCase().includes(search) ||
            ad.userEmail?.toLowerCase().includes(search) ||
            ad.platform?.toLowerCase().includes(search);

        const matchesFilter =
            filter === "ALL"
                ? true
                : filter === "POSTED"
                ? ad.postingStatus === "Posted"
                : (ad.postingStatus || "Not Posted") !== "Posted";

        return matchesSearch && matchesFilter;
    });

    return (
        <div
            style={{
                background: "#000",
                minHeight: "100vh",
                color: "#fff",
                padding: "30px"
            }}
        >
            <h1>APPROVED_ADS</h1>

            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "20px",
                    flexWrap: "wrap"
                }}
            >
                <input
                    type="text"
                    placeholder="Search title, email, platform..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: "10px",
                        minWidth: "300px",
                        background: "#111",
                        color: "#fff",
                        border: "1px solid #333",
                        borderRadius: "8px"
                    }}
                />

                <button
                    onClick={() => setFilter("ALL")}
                    style={{
                        padding: "10px",
                        background: filter === "ALL" ? "#C5FF41" : "#111",
                        color: filter === "ALL" ? "#000" : "#fff",
                        border: "1px solid #333",
                        borderRadius: "8px"
                    }}
                >
                    ALL
                </button>

                <button
                    onClick={() => setFilter("NOT_POSTED")}
                    style={{
                        padding: "10px",
                        background: filter === "NOT_POSTED" ? "#C5FF41" : "#111",
                        color: filter === "NOT_POSTED" ? "#000" : "#fff",
                        border: "1px solid #333",
                        borderRadius: "8px"
                    }}
                >
                    NOT POSTED
                </button>

                <button
                    onClick={() => setFilter("POSTED")}
                    style={{
                        padding: "10px",
                        background: filter === "POSTED" ? "#C5FF41" : "#111",
                        color: filter === "POSTED" ? "#000" : "#fff",
                        border: "1px solid #333",
                        borderRadius: "8px"
                    }}
                >
                    POSTED
                </button>
            </div>

            {ads.length === 0 ? (
                <div>No approved ads.</div>
            ) : (
                filteredAds.map((ad) => (
                    <div
                        key={ad.id}
                        style={{
                            border: "1px solid #222",
                            borderRadius: "12px",
                            padding: "16px",
                            marginBottom: "16px"
                        }}
                    >
                        <h3>{ad.title}</h3>

                        <p>{ad.description}</p>

                        <div>Platform: {ad.platform}</div>
                        <div>Budget: €{ad.budget}</div>
                        <div>Status: {ad.postingStatus || "Not Posted"}</div>
                        <div
                            style={{
                                display: "inline-block",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background: "#111",
                                border: "1px solid #333",
                                fontSize: "11px"
                            }}
                        >
                            {ad.platform}
                        </div>

                        {ad.creativeUrl && (
                            <div style={{ marginTop: "12px" }}>
                                {ad.creativeUrl.includes(".mp4") ? (
                                    <video
                                        src={ad.creativeUrl}
                                        controls
                                        style={{
                                            width: "300px",
                                            borderRadius: "8px"
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={ad.creativeUrl}
                                        style={{
                                            width: "300px",
                                            borderRadius: "8px"
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "12px"
                            }}
                        >
                            <a
                                href={ad.creativeUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    background: "#C5FF41",
                                    color: "#000",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    textDecoration: "none"
                                }}
                            >
                                DOWNLOAD
                            </a>
                            <button
                                onClick={async () => {
                                    if (!window.confirm("Delete this ad?")) return;

                                    await remove(
                                        ref(db, `admin/approved_ads/${ad.id}`)
                                    );
                                }}
                                style={{
                                    background: "#ff4d4d",
                                    color: "#fff",
                                    border: "none",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    cursor: "pointer"
                                }}
                            >
                                DELETE
                            </button>

                            <button
                                onClick={() => markPosted(ad)}
                                style={{
                                    background: "#007fff",
                                    color: "#fff",
                                    border: "none",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    cursor: "pointer"
                                }}
                            >
                                MARK POSTED
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default AllAds;