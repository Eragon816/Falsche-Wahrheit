// DEINE PERSÖNLICHE FIREBASE KONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyAY6S4OzSrmOG4T1ze5bsIr_j67S1upE0Q",
  authDomain: "falsche-wahrheit-spiel.firebaseapp.com",
  databaseURL:
    "https://falsche-wahrheit-spiel-default-rtdb.europe-west1.firebasedatabase.app", // Wichtig: Passe dies an, wenn du eine andere Region gewählt hast!
  projectId: "falsche-wahrheit-spiel",
  storageBucket: "falsche-wahrheit-spiel.appspot.com",
  messagingSenderId: "925857942391",
  appId: "1:925857942391:web:fd5924eeb638d012982f72",
};

// Firebase initialisieren
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
