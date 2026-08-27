import React, {useEffect,useState} from "react";

import {
 Wallet as WalletIcon,
 ArrowDownToLine,
 Clock,
 Loader2,
 ShieldCheck
} from "lucide-react";

import {
 doc,
 onSnapshot,
 collection,
 query,
 orderBy,
 limit
} from "firebase/firestore";

import {
 firestore as db,
 auth
} from "../../firebase";


interface Transaction{

 id:string;
 amount:number;
 timestamp:any;
 type:string;

}


export default function BusinessWallet(){

    const user = auth.currentUser;


    const [balance,setBalance]=useState(0);

    const [transactions,setTransactions]=useState<Transaction[]>([]);

    const [loading,setLoading]=useState(true);



    useEffect(()=>{


    if(!user?.uid) return;



    // BUSINESS BALANCE

    const userRef = doc(
    db,
    "users",
    user.uid
    );


    const unsubscribeUser = onSnapshot(
    userRef,
    snap=>{


    if(snap.exists()){

    const data=snap.data();


    setBalance(
    data.businessWallet?.balance || 0
    );


    }


    }
    );



    // BUSINESS TRANSACTIONS


    const txRef = collection(
    db,
    "users",
    user.uid,
    "businessTransactions"
    );


    const txQuery=query(
    txRef,
    orderBy("timestamp","desc"),
    limit(5)
    );



    const unsubscribeTx=onSnapshot(
    txQuery,
    snap=>{


    const list:Transaction[]=[];


    snap.forEach(doc=>{

    list.push({

    id:doc.id,

    amount:doc.data().amount || 0,

    timestamp:doc.data().timestamp,

    type:doc.data().type || "received"

    });


    });


    setTransactions(list);

    setLoading(false);


    });


    return ()=>{

    unsubscribeUser();

    unsubscribeTx();

    };


    },[user]);




    if(!user){

    return (

    <div className="flex justify-center">

    <Loader2 className="animate-spin"/>

    </div>

    );

    }




    return (

    <div className="w-full max-w-md mx-auto">


    <div className="flex justify-between items-center mb-5">


    <h1 className="text-2xl font-black">

    Business Wallet

    </h1>


    <div className="flex gap-1 items-center text-xs">

    <ShieldCheck size={15}/>

    Secure

    </div>


    </div>



    <div className="
    rounded-[2rem]
    bg-neutral-50
    p-6
    border
    ">


    <p className="
    text-xs
    uppercase
    font-bold
    text-neutral-400
    ">

    Available Business Funds

    </p>


    <h2 className="
    text-4xl
    font-black
    mt-2
    ">

    €{balance.toFixed(2)}

    </h2>



    <button
    className="
    mt-6
    w-full
    bg-black
    text-white
    rounded-xl
    py-3
    font-bold
    flex
    justify-center
    gap-2
    "
    >


    <ArrowDownToLine size={18}/>

    Withdraw Funds


    </button>


    </div>




    <div className="
    mt-5
    rounded-[2rem]
    bg-neutral-50
    p-5
    ">


    <div className="
    flex gap-2
    items-center
    mb-4
    ">

    <Clock size={16}/>

    <h3 className="font-bold text-sm">

    Business Transactions

    </h3>


    </div>



    {

    loading?

    <Loader2 className="animate-spin"/>


    :

    transactions.length===0?


    <p className="text-sm text-neutral-400">

    No business transactions yet

    </p>


    :


    transactions.map(tx=>(


    <div
    key={tx.id}
    className="
    bg-white
    rounded-xl
    p-3
    mb-2
    flex
    justify-between
    "
    >


    <span>

    Payment Received

    </span>


    <span className="font-bold text-green-600">

    +€{tx.amount}

    </span>


    </div>


    ))


    }


    </div>



    </div>


    );


}