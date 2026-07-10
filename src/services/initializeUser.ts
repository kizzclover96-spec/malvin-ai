import { 
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import { firestore } from "../firebase";


export async function initializeUser(user: any) {

  const userRef = doc(
    firestore,
    "users",
    user.uid
  );


  await setDoc(
    userRef,
    {

      uid: user.uid,

      email: user.email,


      roles: {

        customer: true,

        business: true

      },


      wallet: {

        balance: 0,

        currency: "EUR"

      },


      businessWallet: {

        balance: 0,

        currency: "EUR"

      },


      stripe: {

        accountId: null,

        onboarded: false,

        payoutsEnabled:false

      },


      lastLogin: serverTimestamp(),


      createdAt: serverTimestamp()


    },

    {

      merge:true

    }

  );


  console.log(
    "🚀 Malvin universal account synchronized"
  );

}
