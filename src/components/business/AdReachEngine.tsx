import { useEffect } from "react";
import { auth, db } from "../../firebase";
import { ref, get, update } from "firebase/database";

const START_DELAY = 5 * 60 * 1000; // 5 minutes
const UPDATE_INTERVAL = 30000; // 30 seconds

const AdReachEngine = () => {

    const processCampaigns = async () => {

        const userId = auth.currentUser?.uid;

        if (!userId) return;

        try {

        const campaignsSnapshot = await get(
            ref(db, `users/${userId}/campaigns`)
        );

        const campaigns = campaignsSnapshot.val();

        if (!campaigns) return;

        const now = Date.now();

        for (const [campaignId, campaign] of Object.entries(campaigns) as any) {

            if (
            campaign.status !== "Approved" &&
            campaign.status !== "Running"
            ) {
            continue;
            }

            if (!campaign.approvedAt) continue;

            const startTime =
            campaign.approvedAt + START_DELAY;

            if (now < startTime) continue;

            const durationDays =
            Number(campaign.duration || 7);

            const campaignEnd =
            startTime +
            durationDays * 24 * 60 * 60 * 1000;

            // Campaign finished
            if (now >= campaignEnd) {

            await update(
                ref(
                db,
                `users/${userId}/campaigns/${campaignId}`
                ),
                {
                status: "Completed",
                reach:
                    campaign.targetReach ||
                    campaign.reach ||
                    0
                }
            );

            continue;
            }

            let targetReach =
            campaign.targetReach;

            // Generate target reach once
            if (!targetReach) {

            const budget = Number(
                campaign.grandTotal ||
                campaign.budget ||
                10
            );

            const platformMultiplier = (() => {

                switch (campaign.platform) {

                case "TikTok_Ads":
                    return 750;

                case "Instagram_Ads":
                    return 600;

                case "Meta_Ads":
                    return 550;

                case "YouTube_Ads":
                    return 500;

                case "Google_Ads":
                    return 400;

                default:
                    return 500;
                }

            })();

            const viralFactor =
                0.85 + Math.random() * 0.45;

            targetReach = Math.floor(
                budget *
                durationDays *
                platformMultiplier *
                viralFactor
            );

            await update(
                ref(
                db,
                `users/${userId}/campaigns/${campaignId}`
                ),
                {
                targetReach,
                status: "Running"
                }
            );
            }

            const totalTime =
            campaignEnd - startTime;

            const elapsed =
            now - startTime;

            const progress =
            Math.min(
                elapsed / totalTime,
                1
            );

            // Natural growth curve
            const growthCurve =
            Math.pow(progress, 0.8);

            const expectedReach =
            targetReach * growthCurve;

            // Random variation
            const noise =
            (Math.random() * 0.08) - 0.04;

            let newReach = Math.floor(
                expectedReach *
                (1 + noise)
            );

            const currentReach =
                Number(campaign.reach || 0);

                // Never decrease reach
                newReach = Math.max(
                newReach,
                currentReach
            );

            // Only update if difference is noticeable
            if (
                newReach >
                currentReach + 10
                ) {

                await update(
                    ref(
                    db,
                    `users/${userId}/campaigns/${campaignId}`
                    ),
                    {
                    reach: newReach,
                    status: "Running"
                    }
                );
            }
        }

        } catch (error) {
            console.error(
                "AD_REACH_ENGINE_ERROR",
                error
            );
        }
    };

    useEffect(() => {

        processCampaigns();

        const interval = setInterval(
        processCampaigns,
        UPDATE_INTERVAL
        );

        return () => clearInterval(interval);

    }, []);

  return null;
};

export default AdReachEngine;