import { useEffect, useState } from "react";

import {
    doc,
    onSnapshot
} from "firebase/firestore";

import {
    firestore,
    auth
} from "../firebase";


export function useBusinessWallet() {

    const [balance, setBalance] = useState(0);

    const [currency, setCurrency] = useState("EUR");

    const [loading, setLoading] = useState(true);


    useEffect(() => {

        const unsubscribeAuth =
            auth.onAuthStateChanged((user) => {

                if (!user) {

                    setLoading(false);

                    return;

                }


                const unsubscribeWallet =
                    onSnapshot(

                        doc(
                            firestore,
                            "users",
                            user.uid
                        ),

                        (snapshot) => {

                            if (snapshot.exists()) {

                                const data = snapshot.data();

                                setBalance(
                                    data.businessWallet?.balance ?? 0
                                );

                                setCurrency(
                                    data.businessWallet?.currency ?? "EUR"
                                );

                            }

                            setLoading(false);

                        }

                    );


                return unsubscribeWallet;

            });

        return unsubscribeAuth;

    }, []);


    return {

        balance,

        currency,

        loading

    };

}