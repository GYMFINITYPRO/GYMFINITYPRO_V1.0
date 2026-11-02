// ==========================================
// CONFIGURACIÓN DE BASE DE DATOS FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCIda03hCXKULZxiNTnvL4MI8u4ldWXzMA",
  authDomain: "gym-finity.firebaseapp.com",
  databaseURL: "https://gym-finity-default-rtdb.firebaseio.com",
  projectId: "gym-finity",
  storageBucket: "gym-finity.firebasestorage.app",
  messagingSenderId: "231620381377",
  appId: "1:231620381377:web:01f8d727423b131993e240"
};

// Inicializamos la conexión a la Nube
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ==========================================
// ESTADO GLOBAL
// ==========================================
const state = {
  currentUser: JSON.parse(localStorage.getItem('gym_session')) || null, 
  adminTab: 'profile', clientTab: 'routine', viewingClientAsAdmin: false,
  calendarDate: new Date(),
  events: [],
  historyDB: {},
  inventory: [
    'Extensiones de cuadriceps', 'Curl femoral de pie', 'Curl femoral acostado', 'Smith',
    'Press militar hombro en máquina', 'Trapecio en máquina', 'Peck deck hombro', 'Peck deck pecho', 
    'Jalón vertical', 'Aperturas', 'Fondos', 'Crunch abdominal', 'Mancuernas', 'Polea'
  ],
  clients: [],
  currentProductIndex: 0,
  routineTemplates: JSON.parse(localStorage.getItem('gym_routine_templates')) || [] // NUEVA VARIABLE
};

// ==========================================
// FUNCIONES DE SINCRONIZACIÓN CON LA NUBE
// ==========================================
async function loadDataFromFirebase() {
    try {
        const settingsDoc = await db.collection('gymData').doc('settings').get();
        if(settingsDoc.exists) {
            const d = settingsDoc.data();
            if(d.inventory) state.inventory = d.inventory;
        }

        const eventsDoc = await db.collection('gymData').doc('events').get();
        if(eventsDoc.exists) state.events = eventsDoc.data().events || [];

        const historyDoc = await db.collection('gymData').doc('history').get();
        if(historyDoc.exists) state.historyDB = historyDoc.data() || {};

        const clientsSnapshot = await db.collection('clients').get();
        state.clients = clientsSnapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("Error conectando a Firebase:", error);
    }
}

function syncClientToDB(clientRecord) { db.collection('clients').doc(clientRecord.cc).set(clientRecord).catch(e => console.log(e)); }
function deleteClientFromDB(cc) { db.collection('clients').doc(cc).delete().catch(e => console.log(e)); }
function syncSettingsToDB() { db.collection('gymData').doc('settings').set({ inventory: state.inventory }).catch(e => console.log(e)); }
function syncEventsToDB() { db.collection('gymData').doc('events').set({ events: state.events }).catch(e => console.log(e)); }
function syncHistoryToDB() { db.collection('gymData').doc('history').set(state.historyDB).catch(e => console.log(e)); }

// ==========================================
// ENTRENADORES Y PLANES
// ==========================================
const authorizedAdmins = [
    { name: "Daniel Muñoz", cc: "1022991699" },
    { name: "José Muñoz", cc: "79818717" }
];

const gymPlans = [
    { id: "1. SILVER", price: "$70.000", subtitle: "Plan básico", target: "Para quien quiere entrenar por su cuenta y busca una opción económica.", schedule: "6:00am - 3:00pm", classes: false, inbody: false, routine: false, companion: false, discount: false, color: "#E5E7EB", shadow: "rgba(229,231,235,0.5)", durationDays: 30 },
    { id: "2. PREMIUM", price: "$75.000", subtitle: "Plan recomendado", target: "Para quien quiere entrenar con mayor orientación y una rutina adaptada a sus objetivos.", schedule: "6:00am - 10:00pm", classes: true, inbody: "Valoración inicial InBody", routine: "Adaptación personalizada", companion: false, discount: "5% Dcto. suplementos", color: "#3B82F6", shadow: "rgba(59,130,246,0.5)", durationDays: 30 },
    { id: "3. GOLD", price: "$85.000", subtitle: "Plan más completo", target: "Para quien desea un seguimiento más frecuente y beneficios adicionales.", schedule: "6:00am - 10:00pm", classes: true, inbody: "Seguimiento mensual InBody", routine: "Revisión y ajuste mensual", companion: "Acompañante 4 veces/mes", discount: "10% Dcto. suplementos", color: "#FFD700", shadow: "rgba(255,215,0,0.5)", durationDays: 30 },
    { id: "4. FLEX", price: "$49.000", subtitle: "Modalidad flexible", target: "Para quien no quiere comprometerse con un plan mensual tradicional.", schedule: "10 entradas vigencia 1 mes", classes: true, inbody: false, routine: false, companion: false, discount: false, color: "#EC4899", shadow: "rgba(236,72,153,0.5)", durationDays: 30 },
    { id: "1. SILVER BIMESTRE", price: "$130.000", subtitle: "Plan básico", target: "Para quien quiere entrenar por su cuenta y busca una opción económica.", schedule: "6:00am - 3:00pm", classes: false, inbody: false, routine: false, companion: false, discount: false, color: "#A855F7", shadow: "rgba(168,85,247,0.5)", durationDays: 60 },
    { id: "2. PREMIUM BIMESTRE", price: "$140.000", subtitle: "Plan recomendado", target: "Para quien quiere entrenar con mayor orientación y una rutina adaptada a sus objetivos.", schedule: "6:00am - 10:00pm", classes: true, inbody: "Valoración inicial InBody", routine: "Adaptación personalizada", companion: false, discount: "5% Dcto. suplementos", color: "#F97316", shadow: "rgba(249,115,22,0.5)", durationDays: 60 },
    { id: "3. GOLD BIMESTRE", price: "$155.000", subtitle: "Plan más completo", target: "Para quien desea un seguimiento más frecuente y beneficios adicionales.", schedule: "6:00am - 10:00pm", classes: true, inbody: "Seguimiento mensual InBody", routine: "Revisión y ajuste mensual", companion: "Acompañante 4 veces/mes", discount: "10% Dcto. suplementos", color: "#14B8A6", shadow: "rgba(20,184,166,0.5)", durationDays: 60 },
    { id: "5. RUTINA", price: "$10.000", subtitle: "Puede ir guiada", target: "Para quien quiere orientación básica para entrenar sin plan mensual.", schedule: "6:00am - 10:00pm", classes: true, inbody: false, routine: false, companion: false, discount: false, color: "#18181B", shadow: "rgba(255,255,255,0.4)", durationDays: 30 },
    { id: "2. PLAN JUVENIL", price: "$70.000", subtitle: "De 14 a 17 años", target: "Para quien quiere entrenar con mayor orientación y una rutina adaptada a sus objetivos.", schedule: "6:00am - 10:00pm", classes: true, inbody: "Valoración inicial InBody", routine: "Adaptación personalizada", companion: false, discount: false, color: "#06B6D4", shadow: "rgba(6,182,212,0.5)", durationDays: 30 },
    { id: "3. GOLD F. ARMADAS", price: "$70.000", subtitle: "Fuerzas Armadas", target: "Para quien desea un seguimiento más frecuente y beneficios adicionales.", schedule: "6:00am - 10:00pm", classes: true, inbody: "Seguimiento mensual InBody", routine: "Revisión y ajuste mensual", companion: "Acompañante 4 veces/mes", discount: "10% Dcto. suplementos", color: "#10B981", shadow: "rgba(16,185,129,0.5)", durationDays: 30 }
];

const storeBrands = ["TNT", "VITANAS", "PROSCIENCE", "MEGABOLIC", "MACROBLENDS","BIOPRONAT", "ADVANCED", "NUTRAMERICAN"];

const storeProducts = [
    // PRODUCTOS VITANAS
    { brand: "VITANAS", 
        type: "Proteínas", 
        name: "Proteína Army 2LB", 
        img: "PRODUCTOS/VITANAS/VITANAS_ARMY_VAINILLA_2LB.png", 
        desc: "Vitanas Army (Vainilla - 2 lb): Proteína de alta calidad sabor a vainilla, ideal para acelerar la recuperación muscular y optimizar tus resultados diarios.", 
        price: "$205.000", 
        },
    { brand: "VITANAS", 
        type: "Proteínas", 
        name: "Proteína Whey Elite Sin Sabor 2LB", 
        img: "PRODUCTOS/VITANAS/VITANAS_WHEY_ELITE_SINSABOR_2LB.png", 
        desc: "Vitanas Whey Elite: Proteína de suero de alta calidad, perfecta para acelerar la recuperación muscular y construir masa magra de forma eficiente.", 
        price: "$210.000", 
        },
    { brand: "VITANAS", 
        type: "Proteínas", 
        name: "Proteína Gourmet Vainilla 2LB", 
        img: "PRODUCTOS/VITANAS/VITANAS_GOURMET_VAINILLA_5LB.png", 
        desc: "Vitanas Gourmet (Vainilla - 2 lb): Proteína de excelente sabor y fácil disolución, perfecta para complementar tu nutrición diaria y favorecer la recuperación muscular.", 
        price: "$440.000", 
        },
    { brand: "VITANAS", 
        type: "Proteínas", 
        name: "Proteína Whey Elite Vainilla 2LB", 
        img: "PRODUCTOS/VITANAS/VITANAS_WHEY_ELITE_VAINILLA_5LB.png", 
        desc: "Vitanas Whey Elite: Proteína de suero de alta calidad, perfecta para acelerar la recuperación muscular y construir masa magra de forma eficiente.", 
        price: "$265.000", 
        },
    { brand: "VITANAS", 
        type: "Proteínas", 
        name: "Proteína Gourmet Vainilla 5LB", 
        img: "PRODUCTOS/VITANAS/VITANAS_GOURMET_VAINILLA_5LB.png", 
        desc: "Vitanas Gourmet (Vainilla - 5 lb): Proteína de excelente sabor y fácil disolución, perfecta para complementar tu nutrición diaria y favorecer la recuperación muscular.", 
        price: "$515.000", 
        },

    { brand: "VITANAS", 
        type: "Creatinas", 
        name: "Creatina Monohidratada 50 Serv", 
        img: "PRODUCTOS/VITANAS/VITANAS_CREATINA_50S.png", 
        desc: "Vitanas Creatina (50 serv - 150g): Creatina de alta pureza en formato de 50 porciones para potenciar tu fuerza, resistencia y rendimiento físico diario.", 
        price: "$58.000", 
         },
    { brand: "VITANAS", 
        type: "Creatinas", 
        name: "Creatina Monohidratada 100 Serv", 
        img: "PRODUCTOS/VITANAS/VITANAS_CREATINA_100S.png", 
        desc: "Vitanas Creatina (100 serv - 300g): Creatina de alta pureza en formato de 100 porciones para potenciar tu fuerza, resistencia y rendimiento físico diario.", 
        price: "$98.000", 
         },
    
    
    // PRODUCTOS TNT
    { brand: "TNT", 
        type: "Gainers", 
        name: "Gainer Vainilla 10LB", 
        img: "PRODUCTOS/TNT/TNT_MEGA_MASS_CAJA_VAINILLA_10LB.png", 
        desc: "TNT Mega Mass (Vainilla): Ganador de peso hipercalórico diseñado para potenciar el volumen muscular, acelerar la recuperación y aportar la energía necesaria en tus entrenamientos..", 
        price: "$325.000", 
         },
    
    { brand: "TNT", 
        type: "Gainers", 
        name: "Gainer Vainilla 6LB", 
        img: "PRODUCTOS/TNT/TNT_MEGA_MASS_VAINILLA_6LB.png", 
        desc: "TNT Mega Mass (Vainilla): Ganador de peso hipercalórico diseñado para potenciar el volumen muscular, acelerar la recuperación y aportar la energía necesaria en tus entrenamientos.", 
        price: "$196.000", 
         },
    
    { brand: "TNT", 
        type: "Gainers", 
        name: "Gainer Vainilla 3LB", 
        img: "PRODUCTOS/TNT/TNT_MEGA_MASS_BOLSA_VAINILLA_3LB.png", 
        desc: "TNT Mega Mass (Vainilla): Ganador de peso hipercalórico diseñado para potenciar el volumen muscular, acelerar la recuperación y aportar la energía necesaria en tus entrenamientos.", 
        price: "$100.000", 
         },

    { brand: "TNT", 
        type: "Proteínas", 
        name: "Cross Whey Vainilla 5LB", 
        img: "PRODUCTOS/TNT/TNT_CROOS_WHEY_VAINILLA_5LB.png", 
        desc: "Proteína de vainilla (5 lb): Nutrición limpia y deliciosa para impulsar tu recuperación y rendimiento diario.", 
        price: "$127.000", 
        },

    { brand: "TNT", 
        type: "Proteínas", 
        name: "Gourmet Vainilla 2LB", 
        img: "PRODUCTOS/TNT/TNT_GOURTMET_2L.png", 
        desc: "Proteína de vainilla (2 lb): Nutrición limpia y deliciosa para impulsar tu recuperación y rendimiento diario.", 
        price: "$250.000", 
         },

    { brand: "TNT", 
        type: "Creatinas", 
        name: "TNT Creatina Monohidratada 200 Serv - 600g", 
        img: "PRODUCTOS/TNT/TNT_CREATINA_MONOHIDRATADA_200S.png", 
        desc: "Creatina Monohidratada (600g - 200 serv): Creatina pura en formato rinde-más para potenciar tu fuerza, potencia muscular y rendimiento en cada entrenamiento.", 
        price: "$150.000", 
         },

    { brand: "TNT", 
        type: "Creatinas", 
        name: "Creatina Gomitas 30 Serv", 
        img: "PRODUCTOS/TNT/TNT_ULTRACREATINE_GUMMIES_X30S_SANDIA.png", 
        desc: "TNT UltraCreatine Gummies (Sandía):Creatina en gomitas para potenciar tu fuerza y rendimiento de la forma más práctica y deliciosa.", 
        price: "$95.000", 
         },
    { brand: "TNT", 
        type: "Creatinas", 
        name: "Creatina Monohidratada 50 Serv - 150g", 
        img: "PRODUCTOS/TNT/TNT_CREATINA_MONOHIDRATADA_50S.png", 
        desc: "TNT Creatina Monohidratada (150g - 50 serv): Creatina pura en formato rinde-más para potenciar tu fuerza, potencia muscular y rendimiento en cada entrenamiento.", 
        price: "$79.000", 
         },
    { brand: "TNT", 
        type: "Creatinas", 
        name: "Creatina Monohidratada 160 Serv - 480g", 
        img: "PRODUCTOS/TNT/TNT_CREATINA_INSTINCT_UVA_480GR.png", 
        desc: "TNT Creatina Monohidratada (480g - 160 serv): Creatina pura en formato rinde-más para potenciar tu fuerza, potencia muscular y rendimiento en cada entrenamiento.", 
        price: "$75.000", 
         },
    { brand: "TNT", 
        type: "Creatinas", 
        name: "Creatina Monohidratada 50 Serv - 150g", 
        img: "PRODUCTOS/TNT/TNT_CREATINA_INSTINCT_UVA_240GR_30S.png", 
        desc: "TNT Creatina Monohidratada (150g - 50 serv): Creatina pura en formato rinde-más para potenciar tu fuerza, potencia muscular y rendimiento en cada entrenamiento.", 
        price: "$45.000", 
         },
    { brand: "TNT", 
        type: "Pre-Entrenos", 
        name: "Paranoia 480g", 
        img: "PRODUCTOS/TNT/TNT_PARANOIA_PRE_480GR.png", 
        desc: "TNT Paranoia (480g): Pre-entreno energético para potenciar tu rendimiento y concentración durante el entrenamiento.", 
        price: "$115.000", 
         },

    // PRODUCTOS PROSCIENCE
    { brand: "PROSCIENCE", 
        type: "Proteínas", 
        name: "Proteína Citricos 540g", 
        img: "PRODUCTOS/PROSCIENCE/PROSCIENCE_ARMY_PUNCH_540G.png", 
        desc: "ProScience Army (Punch - 540g): Aminoácidos de cadena ramificada y esenciales con sabor a ponche de frutas, ideales para mejorar la recuperación y evitar la fatiga muscular", 
        price: "$115.000",  
         },
    { brand: "PROSCIENCE", 
        type: "Proteínas", 
        name: "Proteina Mezcla Verde 540g", 
        img: "PRODUCTOS/PROSCIENCE/PROSCIENCE_ARMY_GREEN_MIX_540G.png", 
        desc: "ProScience Army (Green Mix - 540g): Fórmula avanzada de aminoácidos con infusión de extractos verdes para proteger la masa muscular y mantener tu cuerpo hidratado durante el entrenamiento.", 
        price: "$115.000", 
         },
    { brand: "PROSCIENCE", 
        type: "Proteínas", 
        name: "Proteina Frutas Tropicales 540g", 
        img: "PRODUCTOS/PROSCIENCE/PROSCIENCE_ARMY_FRUIT_PUNCH_540G.png", 
        desc: "ProScience Army (Fruit Punch - 540g): Aminoácidos esenciales y BCAA con un refrescante sabor a ponche de frutas, diseñados para acelerar la recuperación y prevenir la fatiga muscular.", 
        price: "$115.000", 
         },
    { brand: "PROSCIENCE", 
        type: "Creatina", 
        name: "Creatina Sabor Uva 50 Serv", 
        img: "PRODUCTOS/PROSCIENCE/LEGACY_GRAPE_50S.png", 
        desc: "ProScience Legacy (Uva - 50 serv): Creatina ergogénica de alta calidad sabor a uva, diseñada para maximizar la fuerza, la potencia y el crecimiento muscular.", 
        price: "$130.000", 
         },
    { brand: "PROSCIENCE", 
        type: "Creatina", 
        name: "Creatina Sabor Mandarina 50 Serv", 
        img: "PRODUCTOS/PROSCIENCE/LEGACY_TANGERINE_50S.png", 
        desc: "ProScience Legacy (Mandarina - 50 serv): Fórmula avanzada de creatina sabor a mandarina para potenciar tu rendimiento físico y aumentar tu fuerza en cada serie.", 
        price: "$130.000", 
         },
    { brand: "PROSCIENCE", 
        type: "Creatina", 
        name: "Creatina Frutas Tropicales 50 Serv", 
        img: "PRODUCTOS/PROSCIENCE/LEGACY_FRUIT_50S.png", 
        desc: "ProScience Legacy (Ponche de frutas - 50 serv): Creatina pura sabor a ponche de frutas para impulsar la energía muscular y acelerar tus resultados de entrenamiento.", 
        price: "$130.000", 
         },
    { brand: "PROSCIENCE", 
        type: "Creatina", 
        name: "Creatina Monohidratada 50 Serv", 
        img: "PRODUCTOS/PROSCIENCE/LEGEND_CREATINA_50S.png", 
        desc: "Pro ScienceLegacy (Ponche de frutas - 50 serv): Creatina pura sabor a ponche de frutas para impulsar la energía muscular y acelerar tus resultados de entrenamiento.", 
        price: "$127.000", 
         },
    { brand: "PROSCIENCE", 
        type: "Creatina", 
        name: "Creatina Monohidratada 30 Serv", 
        img: "PRODUCTOS/PROSCIENCE/LEGEND_CREATINA_30S.png", 
        desc: "ProScience Legacy (Ponche de frutas - 30 serv): Creatina pura sabor a ponche de frutas para impulsar la energía muscular y acelerar tus resultados de entrenamiento.", 
        price: "$80.000", 
         },
    { brand: "PROSCIENCE", 
        type: "Vitamina", 
        name: "Omega 3 - 120 Cap", 
        img: "PRODUCTOS/PROSCIENCE/OMEGA3.png", 
        desc: "ProScience Omega 3 (120 cáps): Cápsulas de ácidos grasos esenciales de alta calidad para proteger la salud cardiovascular, apoyar la función cerebral y reducir la inflamación muscular.", 
        price: "$77.000", 
         },
    // MEGABOLIC
    { brand: "MEGABOLIC", 
        type: "Proteínas", 
        name: "Proteína de 10LB", 
        img: "PRODUCTOS/MEGABOLIC/MEGABOLIC_10LB.png", 
        desc: "Megabolic Proteína: Proteína de alto valor biológico para acelerar la recuperación y apoyar el crecimiento muscular de forma efectiva.", 
        price: "$255.000", 
         },
    { brand: "MEGABOLIC", 
        type: "Proteínas", 
        name: "Proteína de 5LB", 
        img: "PRODUCTOS/MEGABOLIC/MEGABOLIC_5LB.png", 
        desc: "Megabolic Proteína: Proteína de alto valor biológico para acelerar la recuperación y apoyar el crecimiento muscular de forma efectiva.", 
        price: "$160.000", 
         },
    { brand: "MEGABOLIC", 
        type: "Proteínas", 
        name: "COMBO Proteína 2LB + Creatina 50 Serv", 
        img: "PRODUCTOS/MEGABOLIC/MEGABOLIC_COMBO.png", 
        desc: "Combo Megabolic (Proteína + Creatina Pura): El dúo perfecto para maximizar tu fuerza, acelerar la recuperación y potenciar el crecimiento muscular en un solo pack.", 
        price: "$121.000", 
         },
    { brand: "MEGABOLIC", 
        type: "Proteínas", 
        name: "Proteína de 2LB", 
        img: "PRODUCTOS/MEGABOLIC/MEGABOLIC_2LB.png", 
        desc: "Megabolic Proteína: Proteína de alto valor biológico para acelerar la recuperación y apoyar el crecimiento muscular de forma efectiva.", 
        price: "$66.000", 
         },
    { brand: "MEGABOLIC", 
        type: "Creatinas", 
        name: "Creatina 50 Servicios", 
        img: "PRODUCTOS/MEGABOLIC/MEGABOLIC_CREATINA_50S.png", 
        desc: "Megabolic Creatina Pura: Creatina de máxima pureza para incrementar la fuerza, la potencia explosiva y el rendimiento en tus entrenamientos.", 
        price: "$56.000", 
         },
    //MACROBLENDS
    { brand: "MACROBLENDS", 
        type: "Creatinas", 
        name: "Creatina 50 Servicios", 
        img: "PRODUCTOS/MACROBLENDS/MACROBLENDS_CREATINA_60S.png", 
        desc: "Macroblends Creatina (60 serv): Creatina pura en formato de 60 porciones, diseñada para maximizar la fuerza, la potencia explosiva y el rendimiento en cada entrenamiento.", 
        price: "$56.000", 
         },
    // NUTRAMERICAN
    { brand: "NUTRAMERICAN",
        type: "Proteínas",
        name: "Proteína Mega Plex 10LB",
        img: "PRODUCTOS/NUTRAMERICAN/NUTRAMERICAN_MEGA_PLEX_10LB.png",
        desc: "Megabolic Mega Plex (10 lb): Ganador de peso y masa muscular de alto aporte calórico y proteico, ideal para potenciar el volumen y la fuerza en entrenamientos exigentes",
        price: "$300.000",
    },
    { brand: "NUTRAMERICAN",
        type: "Proteínas",
        name: "Proteína Mega Plex 2,3LB",
        img: "PRODUCTOS/NUTRAMERICAN/NUTRAMERICAN_MEGA_PLEX_2,3LB.png",
        desc: "Megabolic Mega Plex (2,3 lb): Ganador de peso y masa muscular de alto aporte calórico y proteico, ideal para potenciar el volumen y la fuerza en entrenamientos exigentes",
        price: "$80.000",
    },

    { brand: "NUTRAMERICAN",
        type: "Quemadores de grasa",
        name: "Burner Stack 360g",
        img: "PRODUCTOS/NUTRAMERICAN/NUTRAMERICAN_BURNER_STACK_360GR.png",
        desc: "Nutramerican Burner Stack (360g): Potente fórmula termogénica diseñada para acelerar el metabolismo, favorecer la quema de grasa y aumentar la energía durante tus entrenamientos",
        price: "$140.000",
    },
    { brand: "NUTRAMERICAN",
        type: "Cereales y Snacks",
        name: "Nutra Pops 500g",
        img: "PRODUCTOS/NUTRAMERICAN/NUTRAMERICAN_POPS_500G.png",
        desc: "Nutramerican Nutra Pops (500g): Delicioso snack proteico y crujiente, perfecto para complementar tus requerimientos diarios de proteína de forma práctica y sin culpas.",
        price: "$60.000",
    },
    { brand: "NUTRAMERICAN",
        type: "Cereales y Snacks",
        name: "Pancakes Proteicos 1.65LB",
        img: "PRODUCTOS/NUTRAMERICAN/NUTRAMERICAN_PANCAKE.png",
        desc: "Nutramerican Pancakes Proteicos (1.65 lb): Mezcla lista para preparar deliciosos hot cakes cargados de proteína, ideal para un desayuno o snack nutritivo, saludable y de fácil preparación",
        price: "$50.000",
    },
    // BIOPRONAT
    { brand: "BIOPRONAT",
        type: "Vitaminas y Suplementos",
        name: "Colageno Marino 800g",
        img: "PRODUCTOS/BIOPRONAT/BIOPRONAT_COLAGENO_MARINO_800G.png",
        desc: "Biopronat Colágeno Marino (800g): Colágeno de origen marino de alta biodisponibilidad, diseñado para regenerar articulaciones, mejorar la elasticidad de la piel y fortalecer cabello y uñas.",
        price: "$53.000",
    },
    { brand: "BIOPRONAT",
        type: "Vitaminas y Suplementos",
        name: "Colageno Hidrolizado Vainilla 800g",
        img: "PRODUCTOS/BIOPRONAT/BIOPRONAT_COLAGENO_HIDROLIZADO_VAINILLA.png",
        desc: "Biopronat Colágeno Hidrolizado (Vainilla - 800g): Colágeno de fácil absorción con delicioso sabor a vainilla, ideal para fortalecer articulaciones, huesos, piel, cabello y uñas.",
        price: "$52.000",
    },
    { brand: "BIOPRONAT",
        type: "Vitaminas y Suplementos",
        name: "Colageno Hidrolizado Uva 500ML",
        img: "PRODUCTOS/BIOPRONAT/BIOPRONAT_COLAGENO_HIDROLIZADO_UVA.png",
        desc: "Biopronat Colágeno Hidrolizado (Uva - 500 ml): Colágeno líquido de rápida absorción con sabor a uva, ideal para nutrir articulaciones, fortalecer uñas y restaurar la firmeza de la piel.",
        price: "$16.000",
    },
    // ADVANCED
    { brand: "ADVANCED",
        type: "Proteínas",
        name: "Proteína Super Whey Vainilla 5LB",
        img: "PRODUCTOS/ADVANCED/ADVANCED_PROTEINA_5LB.png",
        desc: "Advances Super Whey Protein Isolate (Vainilla - 5lb): Presentación rinde más de proteína aislada de máxima pureza sabor a vainilla, ideal para apoyar una recuperación muscular óptima y el mantenimiento de masa magra.",
        price: "$240.000",
    },
    { brand: "ADVANCED",
        type: "Proteínas",
        name: "Proteína Super Whey Vainilla 2LB",
        img: "PRODUCTOS/ADVANCED/ADVANCED_PROTEINA_2LB.png",
        desc: "Advances Super Whey Protein Isolate (Vainilla - 2lb): Proteína aislada de rápida absorción con delicioso sabor a vainilla, perfecta para promover la masa muscular magra y acelerar la recuperación.",
        price: "$130.000",
    },
    { brand: "ADVANCED",
        type: "Creatinas",
        name: "Creatina Monohidrato 250g",
        img: "PRODUCTOS/ADVANCED/ADVANCED_CREATINA_50S.png",
        desc: "Advanced Creatina Monohidrato (250g): Suplemento ideal para aumentar la fuerza, potencia y resistencia durante los entrenamientos.",
        price: "$80.000",
    },
    { brand: "ADVANCED",
        type: "Gainers",
        name: "Gainer Vainilla 2LB",
        img: "PRODUCTOS/ADVANCED/ADVANCED_GAINER.png",
        desc: "Advanced Mass Gainer (2LB): Fórmula completa para aumentar la masa muscular, ideal para atletas que necesitan ganar peso de manera saludable.",
        price: "$60.000",
    },

]; 
// Variables de estado para la tienda
let activeBrandIndex = 1; // El carrusel empieza con la marca del medio (VITANAS)
let activeTypeFilter = "Todos";

const gymCoaches = [
    { name: "RZR Training", coach: "Alta Intensidad", img: "CLASES/RZR.png", desc: "Entrenamiento de alta intensidad (HIIT). Supera tus límites, mejora tu resistencia cardiovascular y desarrolla fuerza explosiva." },
    { name: "Rumba Aeróbica", coach: "Cardio Dance", img: "CLASES/RUMBA.png", desc: "Quema calorías y libera el estrés al ritmo de los mejores géneros musicales. Una sesión llena de energía, sudor y pura actitud." },
    { name: "Colombia Rumbera", coach: "Sabor Local", img: "CLASES/COLOMBIA_RUMBERA.png", desc: "Fusión explosiva de ritmos folclóricos y urbanos. Un cardio intenso, diferente y muy divertido con auténtico sabor colombiano." },
    { name: "Step Fit", coach: "Resistencia", img: "CLASES/STEP.png", desc: "Coreografía y resistencia sobre plataforma. Ideal para tonificar piernas y glúteos mientras potencias tu capacidad aeróbica." },
    { name: "Combat & Yoga", coach: "Fuerza y Flexibilidad", img: "CLASES/COMBATYOGA.png", desc: "Fusión perfecta entre la adrenalina y energía de los movimientos de combate con la respiración, flexibilidad y control del yoga. Fortalece cuerpo y mente en una sola sesión." }
];

// ==========================================
// DICCIONARIO DE EJERCICIOS (ACTUALIZADO CON DESCRIPCIONES SIMPLES)
// ==========================================
const exerciseDetails = {
    // ABDOMEN
    "Abdomen Polea Oblicuos Arriba": { img: "ejercicios/ABDOMEN/ABDOMEN_POLEA_OBLICUOS_ARRIBA.png", desc: "De pie, jala la polea desde arriba cruzando el torso hacia la rodilla contraria contrayendo la cintura." },
    "Crunch Balón Medicinal": { img: "ejercicios/ABDOMEN/crunch_balon_medicinal.png", desc: "Acuéstate boca arriba, sostén el balón sobre el pecho y eleva los hombros contrayendo el abdomen." },
    "Crunch con Balón Medicinal": { img: "ejercicios/ABDOMEN/crunch_con_balon_medicinal.png", desc: "Similar al anterior: aprieta tu abdomen alto abrazando o sosteniendo el balón medicinal al subir." },
    "Crunch con Disco": { img: "ejercicios/ABDOMEN/crunch_con_disco.png", desc: "Sostén el disco sobre el pecho con los brazos extendidos y eleva el torso." },
    "Crunch Cruzado Libre": { img: "ejercicios/ABDOMEN/crunch_cruzado_libre.png", desc: "Lleva el codo hacia la rodilla contraria alternando lados." },
    "Crunch Elevando Pelvis": { img: "ejercicios/ABDOMEN/crunch_elevando_pelvis.png", desc: "Eleva la cadera despegándola ligeramente del suelo al mismo tiempo que contraes el abdomen." },
    "Crunch en Banco": { img: "ejercicios/ABDOMEN/crunch_en_banco.png", desc: "Recostado en el banco, contrae el abdomen intentando juntar el pecho con las rodillas." },
    "Crunch en Máquina": { img: "ejercicios/ABDOMEN/crunch_en_maquina.png", desc: "Ajusta la máquina, siéntate y flexiona tu cuerpo hacia adelante sintiendo el esfuerzo en el estómago." },
    "Crunch Frog": { img: "ejercicios/ABDOMEN/crunch_frog.png", desc: "Abre las rodillas simulando una rana y haz el abdominal para trabajar todo el bloque central." },
    "Crunch Levantamiento de Pelvis": { img: "ejercicios/ABDOMEN/crunch_levantamiento_de_pelvis.png", desc: "Levanta la cadera y las piernas hacia el techo controlando la bajada." },
    "Elevación de Pelvis": { img: "ejercicios/ABDOMEN/elevacion_de_pelvis.png", desc: "Acuéstate boca arriba y eleva la cadera despegando los glúteos del piso." },
    "Elevación de Piernas": { img: "ejercicios/ABDOMEN/elevacion_de_piernas.png", desc: "Acuéstate, mantén las piernas rectas y súbelas controlando la tensión en el abdomen bajo." },
    "Elevación Piernas Flexionadas": { img: "ejercicios/ABDOMEN/elevacion_piernas_flexionadas.png", desc: "Lleva las rodillas dobladas hacia el pecho y baja sin que los pies toquen el piso." },
    "Escaladas": { img: "ejercicios/ABDOMEN/escaladas.png", desc: "Boca abajo apoyado en tus manos, lleva las rodillas hacia el pecho de forma rápida simulando que escalas." },
    "Giros con Polea": { img: "ejercicios/ABDOMEN/giros_con_polea.png", desc: "Tira de la polea girando la cintura con los brazos rectos, apretando fuerte el abdomen." },
    "Half Wipers Piernas Estiradas": { img: "ejercicios/ABDOMEN/Half_Wipers_con_piernas_estiradas.png", desc: "Acostado con las piernas apuntando al techo, bájalas hacia un lado y luego al otro." },
    "Half Wipers Piernas Flexionadas": { img: "ejercicios/ABDOMEN/Half_Wipers_con_piernas_flexionadas.png", desc: "Acostado con las rodillas dobladas, llévalas de un lado a otro girando la cadera." },
    "Laterales Oblicuos": { img: "ejercicios/ABDOMEN/laterales_oblicuos.png", desc: "Acostado boca arriba, flexiona tu torso hacia un lado intentando tocar tu talón." },
    "Marcha Horizontal Acostado": { img: "ejercicios/ABDOMEN/marcha_horizontal_acostado.png", desc: "Acuéstate y alterna el movimiento de las piernas simulando caminar en el aire." },
    "Marcha Horizontal Piernas Alternadas": { img: "ejercicios/ABDOMEN/marcha_horizontal_piernas_alternadas.png", desc: "Movimiento de tijera horizontal o pataleo con las piernas en el aire." },
    "Oblicuos Cruzados": { img: "ejercicios/ABDOMEN/oblicuos_cruzados.png", desc: "Elevación del cuerpo girando hacia un lado para enfocar el esfuerzo en la cintura." },
    "Oblicuos en Hiperextensión": { img: "ejercicios/ABDOMEN/oblicuos_en_hiperextension.png", desc: "En la silla romana, ponte de lado y eleva el torso hacia un costado." },
    "Oblicuos Libre": { img: "ejercicios/ABDOMEN/oblicuos_libre.png", desc: "Trabajo libre enfocado a los laterales del abdomen sin peso extra." },
    "Oblicuos con Pesa": { img: "ejercicios/ABDOMEN/OBLICUOS_PESA.png", desc: "De pie, con una pesa en una mano, inclínate hacia ese lado y regresa apretando la cintura contraria." },
    "Plancha Lateral": { img: "ejercicios/ABDOMEN/plancha_lateral.png", desc: "Mantén el cuerpo recto y apoyado sobre un antebrazo de lado, sin dejar caer la cadera." },
    "Puente Lateral con Peso": { img: "ejercicios/ABDOMEN/puente_lateral_con_peso.png", desc: "Plancha lateral mientras sostienes un disco o pesa en la cadera o mano libre." },
    "Puente Lateral sin Peso": { img: "ejercicios/ABDOMEN/puente_lateral_sin_peso.png", desc: "Eleva la cadera de lado y mantén la posición sosteniendo el peso de tu propio cuerpo." },
    "Rueda Abdominal": { img: "ejercicios/ABDOMEN/rueda_abdominal1.png", desc: "Desliza la rueda hacia adelante estirando tu cuerpo y regresa haciendo fuerza con el abdomen." },
    "Rueda Abdominal Basica": { img: "ejercicios/ABDOMEN/rueda_abdominal2.png", desc: "Apoya las rodillas y rueda hacia adelante cuidando de no arquear la zona lumbar." },

    // ADUCTORES
    "Aductores en Máquina": { img: "ejercicios/ADUCTORES/ADUCTORES_MAQUINA.png", desc: "Sentado en la máquina, cierra las piernas empujando los cojines hacia el centro para trabajar la entrepierna." },
    "Peso Muerto Sumo Aductores": { img: "ejercicios/ADUCTORES/PESO_MUERTO_ZUMO_ADUCTORES.png", desc: "Pies bien separados, puntas hacia afuera, baja la cadera para levantar la barra desde el piso." },
    "Sentadilla Sumo Barra": { img: "ejercicios/ADUCTORES/SENTADILLA_ZUMO_BARRA_ADUCTORES.png", desc: "Pies más anchos que tus hombros y con la barra en la espalda, baja apuntando las rodillas hacia afuera." },
    "Sentadilla Sumo Mancuerna": { img: "ejercicios/ADUCTORES/SENTADILLA_ZUMO_MANCUERNA.png", desc: "Pies anchos, sostén una mancuerna en el centro con ambas manos y baja la cadera recta." },
    "Sentadilla Sumo Pesa": { img: "ejercicios/ADUCTORES/SENTADILLA_ZUMO_MANCUERNA_ADUCTORES.png", desc: "Similar a la anterior, enfócate en sentir el estiramiento en la cara interna del muslo." },
    "Zancada Lateral Mancuerna": { img: "ejercicios/ADUCTORES/ZANCADA_LATERAL_MANCUERNA_ADUCTORES.png", desc: "Da un paso grande hacia un lado, doblando esa rodilla mientras la otra pierna se mantiene estirada." },

    // ANTEBRAZO
    "Curl Antebrazo Barra": { img: "ejercicios/ANTEBRAZO/CURL_ANTEBRAZO_BARRA.png", desc: "Apoya los antebrazos, palmas hacia arriba, y flexiona solo las muñecas para subir la barra." },
    "Curl Antebrazo Barra Atrás": { img: "ejercicios/ANTEBRAZO/CURL_ANTEBRAZO_BARRA_ATRAS.png", desc: "Sostén la barra por detrás de tu espalda y flexiona las muñecas hacia arriba." },
    "Curl Antebrazo Mancuerna Pronación": { img: "ejercicios/ANTEBRAZO/CURL_ANTEBRAZO_MANCUERNA_PRONACION.png", desc: "Palmas apuntando hacia abajo, levanta la mancuerna moviendo únicamente la muñeca hacia arriba." },
    "Curl Antebrazo Prono Polea": { img: "ejercicios/ANTEBRAZO/CURL_ANTEBRAZO_PRONO_POLEA.png", desc: "Usando polea baja y agarre palmas abajo, tira hacia arriba doblando las muñecas." },
    "Curl Antebrazo Supinación": { img: "ejercicios/ANTEBRAZO/CURL_ANTEBRAZO_SUPINACION.png", desc: "Aislado para flexión de muñeca con la palma hacia arriba." },
    "Curl Concentrado Antebrazo Barra": { img: "ejercicios/ANTEBRAZO/CURL_CONCENTRADO_ANTEBRAZO_BARRA.png", desc: "Apoyado cómodamente, movimiento corto levantando el peso solo con tus manos." },
    "Curl Concentrado Pronación con Barra": { img: "ejercicios/ANTEBRAZO/CURL_CONCENTRADO_PRONACION_CON_BARRA.png", desc: "Apoya los brazos palmas abajo, sube la barra doblando muñecas al techo." },

    // BICEPS
    "Curl Bíceps en Banco": { img: "ejercicios/BICEPS/CURL_BICEPS_BANCO.png", desc: "Sentado en un banco, flexiona los brazos llevando el peso hacia tus hombros." },
    "Curl Bíceps Barra Abierto": { img: "ejercicios/BICEPS/CURL_BICEPS_BARRA_AGARRE_ABIERTO.png", desc: "Sostén la barra más ancho que tus hombros y llévala al pecho flexionando codos." },
    "Curl Bíceps Barra Cerrado": { img: "ejercicios/BICEPS/CURL_BICEPS_BARRA_AGARRE_CERRADO.png", desc: "Sostén la barra pegando las manos al centro y flexiona subiendo el peso." },
    "Curl Bíceps Barra Romana": { img: "ejercicios/BICEPS/CURL_BICEPS_BARRA_ROMANA.png", desc: "Utiliza la barra de agarres paralelos simulando la forma de un martillo." },
    "Curl Bíceps Bayesian": { img: "ejercicios/BICEPS/CURL_BICEPS_BAYESIAN.png", desc: "De espaldas a la polea, da un paso al frente para estirar el brazo hacia atrás y luego flexiónalo." },
    "Curl Bíceps Unilateral": { img: "ejercicios/BICEPS/CURL_BICEPS_CON_MANCUERNA_UNILATERAL.png", desc: "Trabaja un brazo a la vez manteniendo el codo pegado a las costillas." },
    "Curl Bíceps Concentrado Supino": { img: "ejercicios/BICEPS/CURL_BICEPS_CONCENTRADO_SUPINOO.png", desc: "Sentado, apoya el codo por dentro de tu pierna y flexiona la mancuerna hacia tu rostro." },
    "Curl Bíceps Mancuernas Alternado": { img: "ejercicios/BICEPS/CURL_BICEPS_MANCUERNAS_ALTERNADO.png", desc: "Sube un brazo y al bajarlo comienza a subir el otro de forma continua." },
    "Curl Bíceps Inclinado": { img: "ejercicios/BICEPS/CURL_BICEPS_MANCUERNAS_INCLINADO.png", desc: "Recuéstate en un banco inclinado, deja caer los brazos estirados hacia atrás y flexiona." },
    "Curl Martillo Alternado": { img: "ejercicios/BICEPS/CURL_BICEPS_MARTILLOS_ALTERNADO.png", desc: "Sube las mancuernas con agarre neutro (como sosteniendo un martillo), una por una." },
    "Curl Martillo con Mancuerna": { img: "ejercicios/BICEPS/CURL_BICEPS_MARTILLOS_MANCUERNA.png", desc: "Sube ambas mancuernas al mismo tiempo en posición de martillo." },
    "Curl Martillo Predicador": { img: "ejercicios/BICEPS/CURL_BICEPS_MARTILLOS_PREDICADOR.png", desc: "Apoya los brazos en el banco predicador pero sostén la barra de lado simulando un martillo." },
    "Curl Bíceps Polea": { img: "ejercicios/BICEPS/CURL_BICEPS_POLEA.png", desc: "En la polea baja, dobla los codos para llevar el tubo hacia tus hombros." },
    "Curl Polea Supino": { img: "ejercicios/BICEPS/CURL_BICEPS_POLEA_SUPINO.png", desc: "En polea baja, agarre de palmas apuntando hacia tu cara al tirar." },
    "Curl Soga Polea": { img: "ejercicios/BICEPS/CURL_BICEPS_SOGA_POLEA.png", desc: "Usa el lazo en la polea baja, abre un poco las manos al final del movimiento para mayor contracción." },
    "Curl Bíceps Spider": { img: "ejercicios/BICEPS/CURL_BICEPS_SPIDER.png", desc: "Boca abajo sobre un banco inclinado, deja los brazos colgar directo al piso y flexiona hacia arriba." },
    "Curl Bíceps Unilateral Polea": { img: "ejercicios/BICEPS/CURL_BICEPS_UNILATERAL_POLEA.png", desc: "Tira de la polea a una sola mano, concentrándote en el apretón del músculo." },
    "Curl Unilateral Predicador": { img: "ejercicios/BICEPS/CURL_BICEPS_UNILATERAL_PREDICADOR.png", desc: "Apoyado en la máquina o banco, trabaja a un brazo para mayor aislamiento." },
    "Curl Concentrado Polea": { img: "ejercicios/BICEPS/CURL_CONCENTRADO_POLEA.png", desc: "Usa la resistencia constante del cable para hacer curl a una mano." },
    "Curl Spider Sentado Suelo": { img: "ejercicios/BICEPS/CURL_SPIDER_SENTADO_SUELO.png", desc: "Sentado en el suelo, apoya los codos en tus rodillas y flexiona estrictamente sin balanceo." },

    // CARDIO
    "Bicicleta Acostado": { img: "ejercicios/CARDIO/BICICLETA_ACOSTADO.png", desc: "Acuéstate boca arriba y simula pedalear una bicicleta en el aire." },
    "Boxeo": { img: "ejercicios/CARDIO/BOXEO.png", desc: "Lanza golpes al aire o al saco, manteniendo movimiento de piernas para elevar pulsaciones." },
    "Burpee Cardio": { img: "ejercicios/CARDIO/BURPEE_CARDIO.png", desc: "Ve al suelo en plancha, recoge las piernas rápido y salta hacia arriba aplaudiendo." },
    "Crunch Abdomen Cardio": { img: "ejercicios/CARDIO/CRUNCH_ABDOMEN.png", desc: "Abdominales rápidos y constantes para mantener el ritmo cardíaco elevado." },
    "Escaladoras": { img: "ejercicios/CARDIO/ESCALADORAS.png", desc: "Posición de flexión, alterna llevando las rodillas hacia tu pecho corriendo en el sitio." },
    "Estabilidad Balón": { img: "ejercicios/CARDIO/ESTABILIDAD_BALON.png", desc: "Usa la pelota suiza o bosu para saltos o ejercicios requiriendo equilibrio para activar el cuerpo." },
    "Golpes Saco de Boxeo": { img: "ejercicios/CARDIO/GOLPES_SACO_DE_BOXEO.png", desc: "Secuencias de impacto constantes sobre el saco enfocando la resistencia pulmonar." },
    "Jumping Jack": { img: "ejercicios/CARDIO/JUMPING_JACK.png", desc: "Salta abriendo piernas y brazos al mismo tiempo, luego regresa al centro repetidamente." },
    "Kettlebell Swing": { img: "ejercicios/CARDIO/KETTBELL.MANCUERNA.png", desc: "Impulsa la pesa rusa o mancuerna desde entre tus piernas hacia adelante empujando con la cadera." },
    "Lastre con Peso": { img: "ejercicios/CARDIO/LASTRE_CON_PESO.png", desc: "Ejercicios dinámicos o arrastres añadiendo chaleco o bolsas de peso extra." },
    "Máquina de Remo Cardio": { img: "ejercicios/CARDIO/MAQUINA_REMO_CARDIO.png", desc: "Simula el remo de una barca usando impulso de piernas y jale de espalda fluidamente." },
    "Oblicuos Abdomen Lateral": { img: "ejercicios/CARDIO/OBLICUOS_ABDOMEN_LATERAL.png", desc: "Movimiento dinámico de rotación de cintura y toques laterales acelerados." },
    "Patadas Boxeo": { img: "ejercicios/CARDIO/PATADAS_BOXEO.png", desc: "Combina tus golpes de boxeo con patadas frontales o laterales." },
    "Rodilla al Codo": { img: "ejercicios/CARDIO/RODILLA_AL_CODO.png", desc: "De pie, sube rápido la rodilla intentando tocar el codo del brazo contrario." },
    "Salto Cajón": { img: "ejercicios/CARDIO/SALTO_CAJON.png", desc: "Toma impulso, salta aterrizando con ambos pies sobre el cajón con las rodillas semiflexionadas." },
    "Salto en Cajón y Step": { img: "ejercicios/CARDIO/SALTO_EN_CAJON_Y_STEP.png", desc: "Subidas y bajadas rápidas en escalera o cajón para trabajo cardiovascular intenso." },
    "Saltos Largos": { img: "ejercicios/CARDIO/SALTOS_LARGOS.png", desc: "Salta hacia adelante buscando distancia, cae amortiguando y regresa trotando de espaldas." },
    "Saltos Laterales con Conos": { img: "ejercicios/CARDIO/SALTOS_LATERALES_CON_CONOS.png", desc: "Brinca de un lado a otro esquivando conos en el piso." },
    "Saltos Mancuernas Burpee": { img: "ejercicios/CARDIO/SALTOS_MANCUERNAS_BURPEE.png", desc: "Combina el salto tradicional de burpee, pero levantando unas mancuernas ligeras del piso." },
    "Soga de Bateo (Battle Ropes)": { img: "ejercicios/CARDIO/SOGA_DE_BATEO.png", desc: "Ondula las sogas pesadas rápidamente subiendo y bajando los brazos." },
    "Toques Lado a Lado en Cono": { img: "ejercicios/CARDIO/TOQUES_LADO_A_LADO_EN_CONO.png", desc: "Desplazamiento lateral rápido, agachándote a tocar el cono de un extremo a otro." },

    // CUADRICEPS
    "Cuádriceps Step Up Mancuernas": { img: "ejercicios/CUADRICEPS/CUADRICEPS_STEP_UP_MANCUERNAS.png", desc: "Sube y baja de un banco usando la fuerza de una sola pierna llevando mancuernas." },
    "Extensión de Cuádriceps": { img: "ejercicios/CUADRICEPS/EXTENSIONES_CUADRICEPS.png", desc: "Sentado en la máquina, estira las rodillas para levantar el cojín y aprieta el muslo arriba." },
    "Goblet Squat": { img: "ejercicios/CUADRICEPS/GOBLET_SQUAT_CUADRICEPS.png", desc: "Abraza una mancuerna pesada pegada a tu pecho y baja en sentadilla recta." },
    "Sentadilla Hacka": { img: "ejercicios/CUADRICEPS/HACK_SENTADILLA_CUADRICEPS.png", desc: "Espalda completamente apoyada en la máquina. Baja flexionando las piernas a 90 grados y empuja fuerte." },
    "Peso Muerto Barra Cuádriceps": { img: "ejercicios/CUADRICEPS/PESO_MUERTO_BARRA_CUADRICEPS.png", desc: "Variante de peso muerto enfocando más flexión de rodilla para activar el frente de la pierna." },
    "Peso Muerto Convencional": { img: "ejercicios/CUADRICEPS/PESO_MUERTO_CONVENCIONAL_CUADRICEPS.png", desc: "Levanta la barra del piso doblando caderas y rodillas; el muslo hace el empuje inicial." },
    "Prensa Cuádriceps": { img: "ejercicios/CUADRICEPS/PRENSA_CUADRICEPS.png", desc: "Empuja la plataforma con las piernas manteniendo los pies más abajo en la placa para enfocar el cuádriceps." },
    "Sentadilla Estática": { img: "ejercicios/CUADRICEPS/SENTADILLA_ESTATICA.png", desc: "Recarga tu espalda contra la pared simulando estar sentado en una silla imaginaria." },
    "Sentadilla Libre con Barra": { img: "ejercicios/CUADRICEPS/SENTADILLA_LIBRE_CUADRICEPS.png", desc: "Con la barra en los hombros, flexiona caderas y rodillas hasta bajar lo más que tu movilidad permita." },
    "Sentadilla Smith": { img: "ejercicios/CUADRICEPS/SENTADILLA_SMITH_CUADRICEPS.png", desc: "Usa la barra guiada para bajar seguro enfocando el peso directamente en los muslos." },
    "Sissy Squat": { img: "ejercicios/CUADRICEPS/SESSY_CUADRICEPS.png", desc: "Con pies fijos, echa tu torso hacia atrás doblándote por las rodillas, poniendo todo el peso en el cuádriceps." },
    "Step Up": { img: "ejercicios/CUADRICEPS/STEP_UP_CUADRICEPS.png", desc: "Sube escalones o a un banco alto impulsándote solo con la pierna de apoyo arriba." },

    // ESPALDA
    "Dominadas": { img: "ejercicios/ESPALDA/DOMINADAS.png", desc: "Cuélgate de la barra y levanta todo tu cuerpo hasta que tu barbilla pase el nivel de la barra." },
    "Dominadas Agarre Neutro": { img: "ejercicios/ESPALDA/DOMINADAS_AGARRE_NEUTRO.png", desc: "Sube tu cuerpo usando los agarres paralelos donde tus palmas se miran entre sí." },
    "Dominadas Supino": { img: "ejercicios/ESPALDA/DOMINADAS_SUPINO.png", desc: "Palmas viéndote hacia ti. Sube usando más fuerza de tus bíceps para asistir la espalda." },
    "Hiperextensión Lumbar": { img: "ejercicios/ESPALDA/hiperextension_lumbal.png", desc: "Boca abajo en la silla romana, baja tu cuerpo y luego levántalo apretando la espalda baja." },
    "Jalón Vertical Unilateral": { img: "ejercicios/ESPALDA/JALO_VERTICAL_UNILATERAL.png", desc: "Tira de la polea alta usando solo un brazo, concentrándote en el costado de tu espalda (dorsal)." },
    "Jalón Libre Polea": { img: "ejercicios/ESPALDA/JALON_LIBRE_POLEA.png", desc: "Tira hacia abajo o al pecho de forma fluida." },
    "Jalón Vertical Abierto": { img: "ejercicios/ESPALDA/JALON_VERTICAL_ABIERTO.png", desc: "Sostén la barra ancha y tírala hacia tu pecho sacando pecho y juntando omóplatos." },
    "Jalón Vertical Neutro": { img: "ejercicios/ESPALDA/JALON_VERTICAL_NEUTRO.png", desc: "Jalón al pecho usando agarre cerrado en V para dar grosor a tu espalda." },
    "Jalón Vertical Supino": { img: "ejercicios/ESPALDA/JALON_VERTICAL_SUPINO.png", desc: "Jala la polea alta con las palmas de las manos mirando hacia ti." },
    "Pull Over Mancuerna": { img: "ejercicios/ESPALDA/PULL_OVER.png", desc: "Acostado boca arriba, baja una mancuerna detrás de tu cabeza con brazos semi rectos y vuelve a subirla." },
    "Pull Over Sentado": { img: "ejercicios/ESPALDA/PULL_OVER_SENTADO.png", desc: "En máquina o con polea alta, baja una barra con brazos rígidos hasta la altura del ombligo." },
    "Remo Barra Libre Supinación": { img: "ejercicios/ESPALDA/REMO_BARRALIBRE_SUPINACION.png", desc: "Torso inclinado, agarra la barra por debajo y tira hacia tu ombligo rasgando los muslos." },
    "Remo Colgado (TRX)": { img: "ejercicios/ESPALDA/REMO_COLGADO.png", desc: "Inclínate hacia atrás sujetando las cuerdas o barra baja y tracciona usando el peso de tu cuerpo." },
    "Remo de Pie Polea": { img: "ejercicios/ESPALDA/REMO_DEPIE_POLEA.png", desc: "De pie, jala el cable bajo hacia tu ombligo apretando el centro de la espalda." },
    "Remo Horizontal Abierto": { img: "ejercicios/ESPALDA/REMO_HORIZONTAL_ABIERTO.png", desc: "Remo sentado con agarre ancho, llevando los codos rectos hacia atrás." },
    "Remo Horizontal Cerrado": { img: "ejercicios/ESPALDA/REMO_HORIZONTAL_CERRADO.png", desc: "Sentado, jala el triángulo pegando los codos bien cerca a tus costillas." },
    "Remo Horizontal Hammer": { img: "ejercicios/ESPALDA/REMO_HORIZONTAL_HAMMER.png", desc: "Remo en máquina de palancas (articulada) empujando con el pecho apoyado." },
    "Remo Inferior Polea": { img: "ejercicios/ESPALDA/REMO_INFERIOR_POLEA.png", desc: "Tira del cable desde una posición muy baja, levantando los codos arriba." },
    "Remo Mancuernas": { img: "ejercicios/ESPALDA/REMO_MANCUERNAS.png", desc: "De pie inclinado, jala dos mancuernas simultáneamente hacia tus caderas." },
    "Remo Mancuernas Inclinado": { img: "ejercicios/ESPALDA/REMO_MANCUERNAS_INCLINADO.png", desc: "Pecho apoyado en un banco inclinado, remar con las mancuernas sin trampas ni balanceos." },
    "Remo Mancuernas Libre": { img: "ejercicios/ESPALDA/REMO_MANCUERNAS_LIBRE.png", desc: "Inclinado a 45 grados, jala alternando brazos o ambos a la vez." },
    "Remo Smith": { img: "ejercicios/ESPALDA/REMO_SMITH.png", desc: "Usa la máquina guiada para remar con barra y controlar mejor el peso pesado." },
    "Remo Superior Polea": { img: "ejercicios/ESPALDA/REMO_SUPERIOR_POLEA.png", desc: "Jala poleas ubicadas a la altura de tu rostro hacia tu cara o pecho superior." },
    "Remo Supinación": { img: "ejercicios/ESPALDA/REMO_SUPINACION.png", desc: "Remo con agarre inverso. Las palmas ven hacia arriba en todo momento." },
    "Remo T Supinación": { img: "ejercicios/ESPALDA/REMO_T_SUPINACION.png", desc: "En la barra T, agarre por debajo. Excelente para la parte baja del dorsal." },
    "Remo Unilateral Mancuerna": { img: "ejercicios/ESPALDA/REMO_UNILATERAL_MANCUERNA.png", desc: "Apoya una rodilla y una mano en banco; con el otro brazo jala pesado como encendiendo una motosierra." },
    "Remo T Pronación": { img: "ejercicios/ESPALDA/REMOT_PRONACION.png", desc: "Barra T tradicional con manos mirando hacia abajo." },

    // GEMELOS
    "Pantorrilla de Pie": { img: "ejercicios/GEMELOS/GEMELOS_PANTORRILLA_DE_PIE.png", desc: "Párate en una plataforma y levanta tus talones lo más arriba que puedas." },
    "Pantorrilla en Prensa": { img: "ejercicios/GEMELOS/PANTORRILLA_GEMELOS_PRENSA.png", desc: "Pon las puntas de los pies al borde bajo de la plataforma de la prensa y empuja extendiendo tobillos." },
    "Pantorrilla Gemelos Libre": { img: "ejercicios/GEMELOS/PANTORRILLA_GEMELOS_DE_PIE.png", desc: "Elevación de talones de pie, ya sea sin peso, en máquina o usando mancuernas." },
    "Pantorrilla Sentado Mancuerna": { img: "ejercicios/GEMELOS/PANTORRILLA_GEMELOS_SENTADO_MANCUERNA.png", desc: "Sentado, pon mancuernas sobre tus rodillas y eleva tus talones despegándolos del piso." },
    "Pantorrilla Sentado Máquina": { img: "ejercicios/GEMELOS/PANTORRILLA_SENTADO_MAQUINA.png", desc: "Usa la máquina para pantorrilla sentado que aísla el músculo sóleo en la pierna inferior." },

    // GLUTEO
    "Abducción Máquina": { img: "ejercicios/GLUTEO/ABDUCCION_MAQUINA.png", desc: "Sentado, abre las piernas empujando los cojines hacia afuera sintiendo el costado de los glúteos." },
    "Sentadilla Búlgara Barra": { img: "ejercicios/GLUTEO/BULGARAS_BARRA.png", desc: "Un pie elevado atrás en un banco, baja usando la pierna delantera cuidando equilibrio (con barra)." },
    "Sentadilla Búlgara Mancuernas": { img: "ejercicios/GLUTEO/BÚLGARAS_MANCUERNAS.png", desc: "Mismo ejercicio que la búlgara pero sosteniendo mancuernas a los lados para estabilizar mejor." },
    "Desplantes Mancuernas": { img: "ejercicios/GLUTEO/DESPLANTES_MANCUERNAS.png", desc: "Da pasos largos y profundos flexionando la pierna que queda atrás casi rozando el piso." },
    "Empuje de Cadera Unilateral": { img: "ejercicios/GLUTEO/EMPUJE_CADERA_UNILATERAL.png", desc: "Un Hip Thrust apoyado en una sola pierna para forzar cada glúteo por separado." },
    "Flexión Apoyo Glúteo (Variante)": { img: "ejercicios/GLUTEO/FLEXION_DE_PECHO.png", desc: "Lagartijas integrando patada posterior o activación del abdomen/glúteo estabilizador." },
    "Flexión a Una Mano (Variante)": { img: "ejercicios/GLUTEO/FLEXION_PECHO_UNAMANO.png", desc: "Plancha o lagartija a un brazo que demanda enorme fuerza estabilizadora core-glúteo." },
    "Hip Thrust Barra Libre": { img: "ejercicios/GLUTEO/HIP_TRUSH_BARRALIBRE.png", desc: "Apoya hombros en un banco, barra sobre la cadera, y sube la pelvis contrayendo glúteos al tope." },
    "Hip Thrust Unilateral 2": { img: "ejercicios/GLUTEO/HIP_TRUSH_UNILATERAL.png", desc: "Elevación pélvica de espalda al suelo o banco empujando con un solo pie." },
    "Hiperextensión Glúteo": { img: "ejercicios/GLUTEO/HIPEREXTENSION_GLUTEO.png", desc: "Silla romana: mantén tu espalda un poco encorvada (no recta) para que la fuerza provenga del glúteo y no del lumbar." },
    "Hip Thrust Variación": { img: "ejercicios/GLUTEO/Hip-Thrust_BARRA_LIBRE.png", desc: "Elevación pélvica estándar para máximo tamaño y fuerza en glúteo mayor." },
    "Isquios en Polea (Patada)": { img: "ejercicios/GLUTEO/ISQUIOS_POLEA.png", desc: "Tira del cable con el pie, llevando la pierna recta hacia atrás para activar bajo el glúteo." },
    "Patada Glúteo Polea": { img: "ejercicios/GLUTEO/PATADA_GLUTEO_POLEA.png", desc: "Grillete al tobillo, inclínate y patea hacia atrás y levemente arriba apretando los glúteos." },
    "Peso Muerto Barra": { img: "ejercicios/GLUTEO/PESO_MUERTO_BARRA.png", desc: "Espalda recta, echa cadera hacia atrás para bajar la barra por delante de las espinillas. Siente el estirón atrás." },
    "Peso Muerto Mancuernas": { img: "ejercicios/GLUTEO/PESO_MUERTO_MANCUERNAS.png", desc: "Misma técnica del peso muerto pero usando mancuernas para mayor rango de movimiento." },
    "Peso Muerto Unilateral": { img: "ejercicios/GLUTEO/PESO_MUERTO_UNILATERAL_MANCUERNAS.png", desc: "Levanta una pierna recta hacia atrás como contrapeso mientras bajas el torso en una pierna." },
    "Puentes con Peso": { img: "ejercicios/GLUTEO/PUENTES_CON_PESO.png", desc: "Acostado en el piso boca arriba, sube la cadera sosteniendo una mancuerna o disco sobre ti." },
    "Sentadilla Smith": { img: "ejercicios/GLUTEO/SENTADILLA_SMITH.png", desc: "Baja profundo ubicando los pies un poco por delante de la barra para activar los glúteos." },
    "Zancadas con Mancuernas": { img: "ejercicios/GLUTEO/ZANCADAS_MANCUERNAS.png", desc: "Avanza flexionando hasta hacer ángulos de 90° con ambas rodillas alternadamente." },

    // HOMBRO
    "Elevación Frontal Hombro": { img: "ejercicios/HOMBRO/ELEVACION_FRONTAL_HOMBRO.png", desc: "Sube la mancuerna o disco hacia el frente con los brazos estirados hasta la altura de tus ojos." },
    "Face Pull": { img: "ejercicios/HOMBRO/FACE_PULL.png", desc: "Tira de la cuerda hacia tu rostro, llevando codos altos y hacia atrás (trabaja hombro posterior y postura)." },
    "Peck Deck Posterior": { img: "ejercicios/HOMBRO/PECK_DECK_HOMBRO.png", desc: "Siéntate de frente a la máquina Peck Deck y abre los brazos empujando hacia atrás (hombro trasero)." },
    "Press Militar Hombro": { img: "ejercicios/HOMBRO/PRESS_MILITAR_HOMBRO.png", desc: "Con barra o mancuernas a los lados de la cabeza, empuja hacia arriba al techo." },
    "Rotación Hombro (Manguito)": { img: "ejercicios/HOMBRO/ROTACION_HOMBRO.png", desc: "Pega el codo a la costilla y rota el antebrazo hacia afuera o adentro; es clave para salud articular." },
    "Vuelos Inclinado Hombro": { img: "ejercicios/HOMBRO/VUELOS_BANCO_INCLINADO_HOMBRO.png", desc: "Boca abajo en banco inclinado, eleva las mancuernas a los lados simulando vuelo de pájaro." },
    "Vuelos Frontales Mancuerna": { img: "ejercicios/HOMBRO/VUELOS_FRONTALES_MANCUERNA_HOMBRO.png", desc: "Levanta alternadamente las mancuernas al frente de ti sin balancear la espalda." },
    "Vuelos Hombro Polea": { img: "ejercicios/HOMBRO/VUELOS_HOMBRO_POLEA.png", desc: "Eleva el brazo lateralmente desde la polea baja; la resistencia nunca descansa." },
    "Vuelos Hombro Silla": { img: "ejercicios/HOMBRO/VUELOS_HOMBRO_SILLA.png", desc: "Elevaciones laterales sentado, evita usar el impulso de las piernas." },
    "Vuelos Laterales Hombro Medial": { img: "ejercicios/HOMBRO/VUELOS_LATERALES_HOMBRO_MEDIAL.png", desc: "De pie, alza los brazos por los costados simulando tener jarras de agua para dar amplitud al hombro." },
    "Vuelos Laterales Hombro Polea": { img: "ejercicios/HOMBRO/VUELOS_LATERALES_HOMBRO_POLEA.png", desc: "Similar al anterior pero usando cables cruzados o desde la polea más baja." },
    "Vuelos Laterales Posterior Hombro": { img: "ejercicios/HOMBRO/VUELOS_LATERALES_POSTERIOR_HOMBRO.png", desc: "Torso agachado o en máquina, enfocado en el músculo pequeño de la parte de atrás del hombro." },
    "Vuelos Posterior Sentado": { img: "ejercicios/HOMBRO/VUELOS_POSTERIOR_SENTADO.png", desc: "Sentado, inclínate abrazando tus rodillas y levanta mancuernas a los lados como aleteando." },

    // ISQUIOS
    "Isquios Sentado Máquina": { img: "ejercicios/ISQUIOS/INSQUIOS_SENTADO_MAQUINA.png", desc: "Sentado con el soporte en los tobillos, presiona hacia abajo flexionando las rodillas fuertemente." },
    "Curl Femoral Acostado": { img: "ejercicios/ISQUIOS/ISQUIOS_ACOSTADO_MAQUINA.png", desc: "Acostado boca abajo en la máquina, flexiona las rodillas intentando tocar los glúteos con tus talones." },
    "Isquios Polea de Pie": { img: "ejercicios/ISQUIOS/ISQUIOS_POLEA_DE_PIE.png", desc: "Grillete al tobillo de espaldas a polea; dobla la rodilla trayendo el pie hacia el glúteo." },
    "Peso Muerto Barra (Isquios)": { img: "ejercicios/ISQUIOS/PESO_MUERTO_BARRA.png", desc: "Desciende la barra casi pegada a tus piernas con las rodillas semi-rectas. Siente el estiramiento debajo del glúteo." },

    // PECHO
    "Press Plano Hammer": { img: "ejercicios/PECHO/BANCO_PLANO_HAMMER.png", desc: "Sentado empuja las palancas hacia adelante; excelente para mover peso de forma segura." },
    "Press Banco Plano": { img: "ejercicios/PECHO/PECHO_BANCO_PLANO.png", desc: "Acostado, baja la barra rozando medio pecho y empújala con explosividad." },
    "Press Declinado Barra": { img: "ejercicios/PECHO/PECHO_DECLINADO_BARA.png", desc: "En un banco con la cabeza hacia abajo, empuja la barra (enfocado en zona baja del pectoral)." },
    "Press Declinado Mancuernas": { img: "ejercicios/PECHO/PECHO_DECLINADO_MANCUERNAS.png", desc: "Misma posición boca abajo inclinada pero usando mancuernas para mayor recorrido." },
    "Fondos de Pecho": { img: "ejercicios/PECHO/PECHO_FONDOS.png", desc: "En barras paralelas, inclina ligeramente el torso hacia adelante, baja y empuja subiendo el cuerpo." },
    "Press Inclinado Barra": { img: "ejercicios/PECHO/PECHO_INCLINADO_BARRA.png", desc: "Banco inclinado a 30-45°. Empuja la barra sobre la clavícula (alta del pecho)." },
    "Press Inclinado Hammer": { img: "ejercicios/PECHO/PECHO_INCLINADO_HAMMER.png", desc: "Variante guiada e independiente de press inclinado usando máquina de palancas." },
    "Press Inclinado Mancuernas": { img: "ejercicios/PECHO/PECHO_INCLINADO_MANCUERNAS.png", desc: "Empuje con mancuernas en ángulo inclinado buscando máximo estiramiento abajo." },
    "Press Plano Mancuernas": { img: "ejercicios/PECHO/PECHO_PLANO_MANCUERNAS.png", desc: "Empuje en banco totalmente horizontal usando par de mancuernas." },
    "Press Plano Unilateral": { img: "ejercicios/PECHO/PECHO_PLANO_UNILATERAL.png", desc: "Empuje a un brazo (en máquina o mancuerna), exigiendo mucho control al abdomen." },
    "Peck Deck Pecho (Mariposa)": { img: "ejercicios/PECHO/PECK_DECK_PECHO.png", desc: "Junta los brazos o antebrazos hacia el centro de la máquina, apretando fuerte en medio del recorrido." },

    // TRICEPS
    "Copas Mancuernas": { img: "ejercicios/TRICEPS/COPAS_MANCUERNAS.png", desc: "Sostén una mancuerna pesada con ambas manos por detrás de tu cabeza y empuja directo hacia arriba." },
    "Copa Unilateral Mancuerna": { img: "ejercicios/TRICEPS/COPAS_UNILATERAL_MANCUERNAS.png", desc: "Un brazo a la vez doblando detrás de tu nuca y estirando arriba; el otro brazo apoya el codo." },
    "Extensión Katana Tríceps": { img: "ejercicios/TRICEPS/EXTENSION_KATANA_TRICEPS.png", desc: "Polea a la altura del hombro de espaldas al cable. Saca el brazo simulando desenvainar una espada." },
    "Extensión Polea Cuerda": { img: "ejercicios/TRICEPS/EXTENSION_POLEA_CUERDA.png", desc: "Con la soga empuja hacia abajo, al final abre ligeramente las manos para contractar al máximo." },
    "Extensión Reversa Polea Unilateral": { img: "ejercicios/TRICEPS/EXTENSION_REVERS_POLEA_UNILATERAL.png", desc: "Empuja abajo pero agarrando el cable con la palma mirando hacia arriba (supinación)." },
    "Extensión Tríceps Agarre V": { img: "ejercicios/TRICEPS/EXTENSION_TRICEPS_AGARRE_V.png", desc: "Tira del agarre en V o recto hacia abajo pegando tus codos siempre al cuerpo." },
    "Extensión Tríceps Cuerda Variante": { img: "ejercicios/TRICEPS/EXTENSION_TRICEPS_CUERDA.png", desc: "Desplaza el peso hacia abajo y afuera al concluir la repetición con soga gruesa." },
    "Patada Tríceps Unilateral": { img: "ejercicios/TRICEPS/EXTENSION_UNILATERAL_MANCUERNA.png", desc: "Torso inclinado, empuja la mancuerna estrictamente hacia atrás estirando todo el brazo." },
    "Extensión Vertical Polea": { img: "ejercicios/TRICEPS/EXTENSION_VERTICAL_POLEA.png", desc: "Tríceps sobre la cabeza jalando el cable hacia adelante o arriba para estirar la cabeza larga." },
    "Fondos en Banco": { img: "ejercicios/TRICEPS/FONDOS_EN_BANCO.png", desc: "Manos apoyadas al filo del banco por detrás, piernas estiradas al frente, baja y empuja con tus brazos." },
    "Fondos Hammer Tríceps": { img: "ejercicios/TRICEPS/FONDOS_HAMMER.png", desc: "Empuja fuerte los agarres de la máquina sentada hacia el piso." },
    "Press Francés Barra": { img: "ejercicios/TRICEPS/PRESS_FRANCES_BARRA.png", desc: "Acostado, baja la barra Z a tu frente (cuidado) doblándote de codos y regresa arriba." },
    "Press Francés Barra Inclinado": { img: "ejercicios/TRICEPS/PRESS_FRANCES_BARRA_INCLINADO.png", desc: "En banco inclinado, mayor rango y estiramiento; barra tras la cabeza y estira completo." },
    "Press Francés Mancuernas Inclinado": { img: "ejercicios/TRICEPS/PRESS_FRANCES_MANCUERNAS_INCLINADO.png", desc: "Misma posición que el anterior, pero usando mancuernas para cuidar articulación de muñeca." },
    "Press Francés Polea": { img: "ejercicios/TRICEPS/PRESS_FRANCES_POLEA.png", desc: "Igual que con barra, pero usando la tensión continua y uniforme del cable bajo el banco." },
    "Tríceps Banco Plano (Cerrado)": { img: "ejercicios/TRICEPS/TRICEPS_BANCO_PLANO.png", desc: "Press de banco pero con las manos juntas. Los codos deben rozar tu cuerpo al bajar la barra." },

    // TIBIA
    "Tibial en Máquina": { img: "ejercicios/TIBIA/TIBIA.png", desc: "Sentado, sube la punta del pie o empuja la resistencia hacia tu espinilla, ideal para prevenir molestias por correr." }
};
// Cargar ejercicios creados por el usuario desde la memoria del navegador
const customExercises = JSON.parse(localStorage.getItem('gymFinityCustomEx')) || {};
Object.assign(exerciseDetails, customExercises);

// ALIAS: nombres que usan las rutinas y que en el diccionario tienen otro nombre
Object.assign(exerciseDetails, {
    "Press Inclinado con Barra": exerciseDetails["Press Inclinado Barra"],
    "Fondos en Paralelas": exerciseDetails["Fondos de Pecho"],
    "Sentadilla Profunda con Barra": exerciseDetails["Sentadilla Libre con Barra"],
    "Peso Muerto": exerciseDetails["Peso Muerto Convencional"],
    "Curl Femoral": exerciseDetails["Curl Femoral Acostado"],
    "Press Hombro": exerciseDetails["Press Militar Hombro"],
    "Peck Deck": exerciseDetails["Peck Deck Pecho (Mariposa)"],
    "Abductores": exerciseDetails["Abducción Máquina"]
});

let progressChartInstance = null;
let exerciseChartInstance = null;

// ==========================================
// RESOLVEDOR DE EJERCICIOS PARA PLANTILLAS (IMAGEN / NOMBRE / TÉCNICA)
// ==========================================
const exerciseKeyAliases = {
    "zanvadas_mancuernas": "zancadas_mancuernas",
    "curl_biceps_mancuernas_martillos_alternado": "curl_biceps_martillos_alternado",
    "rueda_abdominal_1": "rueda_abdominal1",
    "rueda_abdominal_2": "rueda_abdominal2"
};

function normalizeExKey(str) {
    return String(str || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\.(png|jpg|jpeg|gif|webp)$/i, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

// Devuelve {name, img, desc} buscando por nombre visible o por nombre de archivo de imagen
function resolveExerciseByKey(key) {
    const k = normalizeExKey(key);
    const alias = exerciseKeyAliases[k] || k;

    for (const exName of Object.keys(exerciseDetails)) {
        const d = exerciseDetails[exName];
        const fileStem = normalizeExKey((d.img || '').split('/').pop());
        if (normalizeExKey(exName) === alias || fileStem === alias) {
            return { name: exName, img: d.img, desc: d.desc };
        }
    }
    return { name: key, img: "ejercicios/default.png", desc: "Sigue las indicaciones de tu entrenador para una correcta ejecución biomecánica." };
}

function repairRoutineTemplates() {
    let changed = false;
    (state.routineTemplates || []).forEach(tpl => {
        (tpl.workout || []).forEach(day => {
            (day.exercises || []).forEach(ex => {
                const needsFix = !ex.img || ex.img.includes('default.png') || !exerciseDetails[ex.name];
                if (!needsFix) return;
                const r = resolveExerciseByKey(ex.name);
                if (!r.img.includes('default.png')) {
                    ex.name = r.name; ex.img = r.img; ex.desc = r.desc; changed = true;
                }
            });
        });
    });
    if (changed) localStorage.setItem('gym_routine_templates', JSON.stringify(state.routineTemplates));
}

// Actualiza (en memoria) las imágenes de un plan ya guardado usando el diccionario actual de ejercicios
window.refreshWorkoutImages = function(workout) {
    if (!Array.isArray(workout)) return;
    workout.forEach(day => {
        (day.exercises || []).forEach(ex => {
            if (!ex || !ex.name) return;
            const r = (exerciseDetails[ex.name] && exerciseDetails[ex.name].img)
                ? { img: exerciseDetails[ex.name].img }
                : resolveExerciseByKey(ex.name);
            if (r.img && !r.img.includes('default.png')) ex.img = r.img;
        });
    });
};

// ==========================================
// IMÁGENES DE EJERCICIOS AUTO-REPARABLES
// (GitHub Pages distingue mayúsculas/minúsculas; si una ruta falla se prueban variantes)
// ==========================================
window.__gymImgOk = window.__gymImgOk || {};
window.GYM_IMG_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ffffff"/><g fill="#a1a1aa"><rect x="14" y="38" width="10" height="24" rx="3"/><rect x="26" y="30" width="10" height="40" rx="3"/><rect x="38" y="46" width="24" height="8"/><rect x="64" y="30" width="10" height="40" rx="3"/><rect x="76" y="38" width="10" height="24" rx="3"/></g></svg>');

window.gymImgCandidates = function(src) {
    const clean = String(src || '').split('?')[0];
    const m = clean.match(/^(.*\/)?([^\/]+?)(\.[A-Za-z0-9]+)?$/);
    if (!m) return [];
    const dirFull = m[1] || '';
    const name = m[2];
    const ext = m[3] || '.png';
    const dirParts = dirFull.replace(/\/$/, '').split('/');
    const folder = dirParts[dirParts.length - 1] || '';
    const base = dirParts.slice(0, -1).join('/');
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

    const folders = [...new Set([folder, folder.toLowerCase(), cap(folder)])];
    const names = [...new Set([
        name, name.toLowerCase(), cap(name),
        name.replace(new RegExp('^' + folder + '_', 'i'), ''),
        folder.toUpperCase() + '_' + name
    ])];
    const exts = [...new Set([ext, ext.toUpperCase(), '.png', '.jpg', '.jpeg', '.webp', '.gif'])];

    const out = [];
    const add = (f, n, e) => {
        const url = (base ? base + '/' : '') + (f ? f + '/' : '') + n + e;
        if (url !== clean && !out.includes(url)) out.push(url);
    };
    names.forEach(n => add(folder, n, ext));              // 1) mismo folder y extensión, otro nombre
    folders.forEach(f => names.forEach(n => add(f, n, ext))); // 2) otras mayúsculas de carpeta
    exts.forEach(e => names.forEach(n => add(folder, n, e)));  // 3) otras extensiones
    return out.slice(0, 30);
};

window.gymImgFix = function(img) {
    if (!img.dataset.gymOrig) img.dataset.gymOrig = img.getAttribute('src') || '';
    const orig = img.dataset.gymOrig;
    if (!img.__gymC) {
        img.__gymC = (window.__gymImgOk[orig] ? [window.__gymImgOk[orig]] : []).concat(window.gymImgCandidates(orig));
        img.__gymI = 0;
        img.onload = function() { if (img.src && !img.src.startsWith('data:')) window.__gymImgOk[orig] = img.getAttribute('src'); };
    }
    if (img.__gymI < img.__gymC.length) {
        img.src = img.__gymC[img.__gymI++];
    } else {
        img.onerror = null;
        img.onload = null;
        img.src = window.GYM_IMG_PLACEHOLDER;
    }
};

// ==========================================
// INICIALIZACIÓN Y CARGA DESDE LA NUBE
// ==========================================
window.onload = async () => {
  const loader = document.getElementById('loading-screen');
  if(loader) {
      loader.classList.remove('hide-loader');
      const title = loader.querySelector('h1');
      if(title) title.innerHTML = '<span class="text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">GYM</span> <span class="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]">FINITY</span>';
  }
  
  await loadDataFromFirebase();
  performSystemMaintenance(); 
  migrateOldRoutines(); 
  
  if(loader) {
      setTimeout(() => {
         loader.classList.add('hide-loader');
      }, 500);
  }
  
  if (state.currentUser && state.currentUser.role === 'client') {
      const dbClient = state.clients.find(c => c.cc === state.currentUser.cc);
      if(dbClient) {
          state.currentUser.record = dbClient;
          localStorage.setItem('gym_session', JSON.stringify(state.currentUser));
      }
  }
  // CARGA DE RUTINAS BASE (DEL TXT) SI EL SISTEMA ESTÁ VACÍO
  if (state.routineTemplates.length === 0) {
      
      // Función constructora para mantener el código limpio y no repetir variables
      const buildDay = (dayName, exNames, sets, reps, rest) => {
          return {
              day: dayName,
              exercises: exNames.map(name => {
                  const r = resolveExerciseByKey(name);
                  return {
                      name: r.name,
                      img: r.img,
                      sets: sets,
                      reps: reps,
                      rest: rest,
                      desc: r.desc
                  };
              })
          };
      };

      const defaultTXT = [
          // ==========================================
          // OBJETIVO: HIPERTROFIA (2-3 Series | 8-12 Reps | 3-5 min)
          // ==========================================
          {
              objective: "HIPERTROFIA - 3 DÍAS", days: 3,
              workout: [
                  buildDay("Día 1", ["BANCO_PLANO_HAMMER", "REMO_HORIZONTAL_HAMMER", "PRENSA_CUADRICEPS", "INSQUIOS_SENTADO_MAQUINA", "PECK_DECK_HOMBRO", "EXTENSION_POLEA_CUERDA"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 2", ["PECHO_INCLINADO_HAMMER", "JALON_VERTICAL_NEUTRO", "HACK_SENTADILLA_CUADRICEPS", "ISQUIOS_ACOSTADO_MAQUINA", "EXTENSION_VERTICAL_POLEA", "CURL_BICEPS_UNILATERAL_PREDICADOR"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 3", ["PECK_DECK_PECHO", "REMO_INFERIOR_POLEA", "EXTENSIONES_CUADRICEPS", "PANTORRILLA_GEMELOS_PRENSA", "CURL_BICEPS_POLEA", "crunch_en_maquina"], "2-3 Series", "8-12 Reps", "3-5 min")
              ]
          },
          {
              objective: "HIPERTROFIA - 4 DÍAS", days: 4,
              workout: [
                  buildDay("Día 1 (Torso)", ["BANCO_PLANO_HAMMER", "REMO_HORIZONTAL_HAMMER", "PECHO_INCLINADO_HAMMER", "JALON_VERTICAL_ABIERTO", "PECK_DECK_HOMBRO", "EXTENSION_POLEA_CUERDA"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 2 (Pierna)", ["PRENSA_CUADRICEPS", "INSQUIOS_SENTADO_MAQUINA", "EXTENSIONES_CUADRICEPS", "ABDUCCION_MAQUINA", "PANTORRILLA_SENTADO_MAQUINA", "crunch_en_maquina"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 3 (Torso)", ["PECK_DECK_PECHO", "REMO_INFERIOR_POLEA", "VUELOS_LATERALES_HOMBRO_POLEA", "PRESS_FRANCES_POLEA", "CURL_BICEPS_POLEA", "ABDOMEN_POLEA_OBLICUOS_ARRIBA"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 4 (Pierna)", ["HACK_SENTADILLA_CUADRICEPS", "ISQUIOS_ACOSTADO_MAQUINA", "ADUCTORES_MAQUINA", "PANTORRILLA_GEMELOS_PRENSA", "TIBIA", "rueda_abdominal_1"], "2-3 Series", "8-12 Reps", "3-5 min")
              ]
          },
          {
              objective: "HIPERTROFIA - 5 DÍAS", days: 5,
              workout: [
                  buildDay("Día 1 (Pecho/Core)", ["BANCO_PLANO_HAMMER", "PECHO_INCLINADO_HAMMER", "PECK_DECK_PECHO", "PECHO_FONDOS", "crunch_en_maquina"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 2 (Espalda)", ["REMO_HORIZONTAL_HAMMER", "JALON_VERTICAL_ABIERTO", "JALON_VERTICAL_NEUTRO", "REMO_INFERIOR_POLEA", "EXTENSION_VERTICAL_POLEA"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 3 (Piernas A)", ["PRENSA_CUADRICEPS", "EXTENSIONES_CUADRICEPS", "INSQUIOS_SENTADO_MAQUINA", "ABDUCCION_MAQUINA", "PANTORRILLA_GEMELOS_PRENSA"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 4 (Hombro/Brazos)", ["PECK_DECK_HOMBRO", "VUELOS_LATERALES_HOMBRO_POLEA", "EXTENSION_POLEA_CUERDA", "FONDOS_HAMMER", "CURL_BICEPS_UNILATERAL_PREDICADOR"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 5 (Piernas B)", ["HACK_SENTADILLA_CUADRICEPS", "ISQUIOS_ACOSTADO_MAQUINA", "ADUCTORES_MAQUINA", "PANTORRILLA_SENTADO_MAQUINA", "TIBIA"], "2-3 Series", "8-12 Reps", "3-5 min")
              ]
          },
          {
              objective: "HIPERTROFIA - 6 DÍAS", days: 6,
              workout: [
                  buildDay("Día 1 (Empuje)", ["BANCO_PLANO_HAMMER", "PECHO_INCLINADO_HAMMER", "PECK_DECK_HOMBRO", "EXTENSION_POLEA_CUERDA", "FONDOS_HAMMER"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 2 (Tracción)", ["REMO_HORIZONTAL_HAMMER", "JALON_VERTICAL_ABIERTO", "REMO_INFERIOR_POLEA", "CURL_BICEPS_UNILATERAL_PREDICADOR", "CURL_BICEPS_POLEA"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 3 (Pierna)", ["PRENSA_CUADRICEPS", "INSQUIOS_SENTADO_MAQUINA", "EXTENSIONES_CUADRICEPS", "PANTORRILLA_GEMELOS_PRENSA", "crunch_en_maquina"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 4 (Empuje)", ["PECK_DECK_PECHO", "PECHO_FONDOS", "VUELOS_LATERALES_HOMBRO_POLEA", "PRESS_FRANCES_POLEA", "EXTENSION_VERTICAL_POLEA"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 5 (Tracción)", ["JALON_VERTICAL_NEUTRO", "REMO_DEPIE_POLEA", "JALON_LIBRE_POLEA", "CURL_CONCENTRADO_POLEA", "CURL_ANTEBRAZO_PRONO_POLEA"], "2-3 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 6 (Pierna)", ["HACK_SENTADILLA_CUADRICEPS", "ISQUIOS_ACOSTADO_MAQUINA", "ADUCTORES_MAQUINA", "ABDUCCION_MAQUINA", "PANTORRILLA_SENTADO_MAQUINA"], "2-3 Series", "8-12 Reps", "3-5 min")
              ]
          },

          // ==========================================
          // OBJETIVO: BAJAR DE GRASA (3-4 Series | 10-15 Reps | 2-3 min)
          // ==========================================
          {
              objective: "BAJAR DE GRASA - 3 DÍAS", days: 3,
              workout: [
                  buildDay("Día 1 (Cardio/Core)", ["ESCALADORAS", "BICICLETA_ACOSTADO", "crunch_en_maquina", "plancha_lateral", "rueda_abdominal_1"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 2 (Full Body A)", ["PRENSA_CUADRICEPS", "BANCO_PLANO_HAMMER", "REMO_HORIZONTAL_HAMMER", "INSQUIOS_SENTADO_MAQUINA", "EXTENSION_POLEA_CUERDA"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 3 (Full Body B)", ["HACK_SENTADILLA_CUADRICEPS", "PECHO_INCLINADO_HAMMER", "JALON_VERTICAL_ABIERTO", "ISQUIOS_ACOSTADO_MAQUINA", "CURL_BICEPS_POLEA"], "3-4 Series", "10-15 Reps", "2-3 min")
              ]
          },
          {
              objective: "BAJAR DE GRASA - 4 DÍAS", days: 4,
              workout: [
                  buildDay("Día 1 (Cardio/Core)", ["MAQUINA_REMO_CARDIO", "ESCALADORAS", "ABDOMEN_POLEA_OBLICUOS_ARRIBA", "giros_con_polea", "crunch_en_maquina"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 2 (Pierna)", ["PRENSA_CUADRICEPS", "EXTENSIONES_CUADRICEPS", "PANTORRILLA_GEMELOS_PRENSA", "INSQUIOS_SENTADO_MAQUINA", "ADUCTORES_MAQUINA"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 3 (Empuje)", ["BANCO_PLANO_HAMMER", "PECHO_INCLINADO_HAMMER", "PECK_DECK_PECHO", "PRESS_FRANCES_POLEA", "EXTENSION_POLEA_CUERDA"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 4 (Tracción)", ["REMO_HORIZONTAL_HAMMER", "JALON_VERTICAL_ABIERTO", "REMO_INFERIOR_POLEA", "PECK_DECK_HOMBRO", "CURL_BICEPS_POLEA"], "3-4 Series", "10-15 Reps", "2-3 min")
              ]
          },
          {
              objective: "BAJAR DE GRASA - 5 DÍAS", days: 5,
              workout: [
                  buildDay("Día 1 (Cardio 1)", ["ESCALADORAS", "BICICLETA_ACOSTADO", "crunch_en_maquina", "plancha_lateral", "rueda_abdominal_1"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 2 (Pierna)", ["PRENSA_CUADRICEPS", "HACK_SENTADILLA_CUADRICEPS", "ISQUIOS_ACOSTADO_MAQUINA", "ABDUCCION_MAQUINA", "PANTORRILLA_SENTADO_MAQUINA"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 3 (Cardio 2)", ["MAQUINA_REMO_CARDIO", "ESCALADORAS", "OBLICUOS_ABDOMEN_LATERAL", "crunch_cruzado_libre", "elevacion_de_piernas"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 4 (Empuje)", ["BANCO_PLANO_HAMMER", "PECHO_FONDOS", "EXTENSION_POLEA_CUERDA", "VUELOS_LATERALES_HOMBRO_POLEA", "PRESS_FRANCES_POLEA"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 5 (Tracción)", ["REMO_HORIZONTAL_HAMMER", "JALON_VERTICAL_NEUTRO", "JALON_LIBRE_POLEA", "CURL_BICEPS_UNILATERAL_PREDICADOR", "CURL_CONCENTRADO_POLEA"], "3-4 Series", "10-15 Reps", "2-3 min")
              ]
          },
          {
              objective: "BAJAR DE GRASA - 6 DÍAS", days: 6,
              workout: [
                  buildDay("Día 1 (Cardio 1)", ["ESCALADORAS", "crunch_en_maquina", "ABDOMEN_POLEA_OBLICUOS_ARRIBA", "giros_con_polea", "rueda_abdominal_2"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 2 (Pierna A)", ["PRENSA_CUADRICEPS", "EXTENSIONES_CUADRICEPS", "INSQUIOS_SENTADO_MAQUINA", "PANTORRILLA_GEMELOS_PRENSA", "ADUCTORES_MAQUINA"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 3 (Empuje)", ["BANCO_PLANO_HAMMER", "PECHO_INCLINADO_HAMMER", "PECK_DECK_PECHO", "EXTENSION_POLEA_CUERDA", "PECK_DECK_HOMBRO"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 4 (Cardio 2)", ["MAQUINA_REMO_CARDIO", "BICICLETA_ACOSTADO", "crunch_balon_medicinal", "plancha_lateral", "elevacion_piernas_flexionadas"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 5 (Tracción)", ["REMO_HORIZONTAL_HAMMER", "JALON_VERTICAL_ABIERTO", "REMO_INFERIOR_POLEA", "CURL_BICEPS_POLEA", "CURL_ANTEBRAZO_PRONO_POLEA"], "3-4 Series", "10-15 Reps", "2-3 min"),
                  buildDay("Día 6 (Pierna B)", ["HACK_SENTADILLA_CUADRICEPS", "ISQUIOS_ACOSTADO_MAQUINA", "ABDUCCION_MAQUINA", "PANTORRILLA_SENTADO_MAQUINA", "TIBIA"], "3-4 Series", "10-15 Reps", "2-3 min")
              ]
          },

          // ==========================================
          // OBJETIVO: GLÚTEO Y PIERNA (3-4 Series | 8-12 Reps | 3-5 min)
          // ==========================================
          {
              objective: "GLÚTEO Y PIERNA - 3 DÍAS", days: 3,
              workout: [
                  buildDay("Día 1 (Pierna A)", ["HIP_TRUSH_BARRALIBRE", "PESO_MUERTO_BARRA", "SENTADILLA_LIBRE_CUADRICEPS", "BÚLGARAS_MANCUERNAS", "ABDUCCION_MAQUINA"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 2 (Torso Libre)", ["PECHO_BANCO_PLANO", "REMO_MANCUERNAS_LIBRE", "PRESS_MILITAR_HOMBRO", "DOMINADAS", "COPAS_MANCUERNAS"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 3 (Pierna B)", ["PESO_MUERTO_MANCUERNAS", "ZANCADAS_MANCUERNAS", "PATADA_GLUTEO_POLEA", "ISQUIOS_POLEA", "PUENTES_CON_PESO"], "3-4 Series", "8-12 Reps", "3-5 min")
              ]
          },
          {
              objective: "GLÚTEO Y PIERNA - 4 DÍAS", days: 4,
              workout: [
                  buildDay("Día 1 (Pierna A)", ["HIP_TRUSH_BARRALIBRE", "BULGARAS_BARRA", "PESO_MUERTO_BARRA", "ABDUCCION_MAQUINA", "PUENTES_CON_PESO"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 2 (Torso Libre)", ["PECHO_INCLINADO_MANCUERNAS", "REMO_BARRALIBRE_SUPINACION", "VUELOS_FRONTALES_MANCUERNA_HOMBRO", "CURL_BICEPS_MANCUERNAS_ALTERNADO", "PRESS_FRANCES_BARRA"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 3 (Pierna B)", ["SENTADILLA_LIBRE_CUADRICEPS", "ZANVADAS_MANCUERNAS", "PATADA_GLUTEO_POLEA", "ISQUIOS_POLEA_DE_PIE", "ADUCTORES_MAQUINA"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 4 (Core)", ["rueda_abdominal_1", "crunch_con_balon_medicinal", "plancha_lateral", "elevacion_de_piernas", "OBLICUOS_PESA"], "3-4 Series", "8-12 Reps", "3-5 min")
              ]
          },
          {
              objective: "GLÚTEO Y PIERNA - 5 DÍAS", days: 5,
              workout: [
                  buildDay("Día 1 (Pierna A)", ["HIP_TRUSH_BARRALIBRE", "PESO_MUERTO_BARRA", "BÚLGARAS_MANCUERNAS", "ABDUCCION_MAQUINA", "PUENTES_CON_PESO"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 2 (Torso A)", ["PECHO_BANCO_PLANO", "REMO_MANCUERNAS", "PRESS_MILITAR_HOMBRO", "EXTENSION_UNILATERAL_MANCUERNA", "CURL_BICEPS_MANCUERNAS_ALTERNADO"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 3 (Pierna B)", ["SENTADILLA_SMITH", "ZANCADAS_MANCUERNAS", "PATADA_GLUTEO_POLEA", "ISQUIOS_POLEA", "ADUCTORES_MAQUINA"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 4 (Torso B)", ["PECHO_DECLINADO_MANCUERNAS", "DOMINADAS_SUPINO", "VUELOS_LATERALES_HOMBRO_MEDIAL", "COPAS_MANCUERNAS", "CURL_BICEPS_BARRA_ROMANA"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 5 (Pierna C)", ["HIP_TRUSH_UNILATERAL", "PESO_MUERTO_UNILATERAL_MANCUERNAS", "DESPLANTES_MANCUERNAS", "HIPEREXTENSION_GLUTEO", "PUENTES_CON_PESO"], "3-4 Series", "8-12 Reps", "3-5 min")
              ]
          },
          {
              objective: "GLÚTEO Y PIERNA - 6 DÍAS", days: 6,
              workout: [
                  buildDay("Día 1 (Pierna A)", ["HIP_TRUSH_BARRALIBRE", "BULGARAS_BARRA", "PESO_MUERTO_BARRA", "ABDUCCION_MAQUINA", "PUENTES_CON_PESO"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 2 (Torso A)", ["PECHO_BANCO_PLANO", "REMO_MANCUERNAS_LIBRE", "PRESS_MILITAR_HOMBRO", "PRESS_FRANCES_BARRA", "CURL_BICEPS_BARRA_AGARRE_ABIERTO"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 3 (Pierna B)", ["SENTADILLA_LIBRE_CUADRICEPS", "ZANCADAS_MANCUERNAS", "PATADA_GLUTEO_POLEA", "ISQUIOS_POLEA_DE_PIE", "PANTORRILLA_GEMELOS_DE_PIE"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 4 (Torso B)", ["PECHO_INCLINADO_BARRA", "DOMINADAS_AGARRE_NEUTRO", "VUELOS_BANCO_INCLINADO_HOMBRO", "COPAS_UNILATERAL_MANCUERNAS", "CURL_BICEPS_MANCUERNAS_MARTILLOS_ALTERNADO"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 5 (Pierna C)", ["HIP_TRUSH_UNILATERAL", "PESO_MUERTO_UNILATERAL_MANCUERNAS", "BÚLGARAS_MANCUERNAS", "HIPEREXTENSION_GLUTEO", "ABDUCCION_MAQUINA"], "3-4 Series", "8-12 Reps", "3-5 min"),
                  buildDay("Día 6 (Core)", ["rueda_abdominal_1", "crunch_con_disco", "elevacion_de_pelvis", "laterales_oblicuos", "plancha_lateral"], "3-4 Series", "8-12 Reps", "3-5 min")
              ]
          },

          // ==========================================
          // OBJETIVO: FUERZA (2-3 Series | 6-10 Reps | 3-5 min)
          // ==========================================
          {
              objective: "FUERZA - 3 DÍAS", days: 3,
              workout: [
                  buildDay("Día 1", ["BANCO_PLANO_HAMMER", "REMO_HORIZONTAL_HAMMER", "PRENSA_CUADRICEPS", "ISQUIOS_ACOSTADO_MAQUINA", "FONDOS_HAMMER"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 2", ["PECHO_INCLINADO_HAMMER", "JALON_VERTICAL_ABIERTO", "HACK_SENTADILLA_CUADRICEPS", "INSQUIOS_SENTADO_MAQUINA", "PECK_DECK_HOMBRO"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 3", ["PECK_DECK_PECHO", "JALON_VERTICAL_NEUTRO", "PRENSA_CUADRICEPS", "ISQUIOS_ACOSTADO_MAQUINA", "EXTENSION_POLEA_CUERDA"], "2-3 Series", "6-10 Reps", "3-5 min")
              ]
          },
          {
              objective: "FUERZA - 4 DÍAS", days: 4,
              workout: [
                  buildDay("Día 1 (Empuje A)", ["BANCO_PLANO_HAMMER", "PECHO_INCLINADO_HAMMER", "PRENSA_CUADRICEPS", "PECK_DECK_HOMBRO", "EXTENSION_POLEA_CUERDA"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 2 (Tracción A)", ["REMO_HORIZONTAL_HAMMER", "JALON_VERTICAL_ABIERTO", "INSQUIOS_SENTADO_MAQUINA", "CURL_BICEPS_UNILATERAL_PREDICADOR", "PANTORRILLA_GEMELOS_PRENSA"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 3 (Empuje B)", ["PECHO_FONDOS", "PECK_DECK_PECHO", "HACK_SENTADILLA_CUADRICEPS", "VUELOS_LATERALES_HOMBRO_POLEA", "FONDOS_HAMMER"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 4 (Tracción B)", ["JALON_VERTICAL_NEUTRO", "REMO_INFERIOR_POLEA", "ISQUIOS_ACOSTADO_MAQUINA", "CURL_BICEPS_POLEA", "PANTORRILLA_SENTADO_MAQUINA"], "2-3 Series", "6-10 Reps", "3-5 min")
              ]
          },
          {
              objective: "FUERZA - 5 DÍAS", days: 5,
              workout: [
                  buildDay("Día 1 (Empuje A)", ["BANCO_PLANO_HAMMER", "PECHO_INCLINADO_HAMMER", "PECK_DECK_HOMBRO", "EXTENSION_POLEA_CUERDA", "crunch_en_maquina"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 2 (Tracción A)", ["REMO_HORIZONTAL_HAMMER", "JALON_VERTICAL_ABIERTO", "JALON_VERTICAL_NEUTRO", "CURL_BICEPS_UNILATERAL_PREDICADOR", "CURL_ANTEBRAZO_PRONO_POLEA"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 3 (Pierna)", ["PRENSA_CUADRICEPS", "HACK_SENTADILLA_CUADRICEPS", "INSQUIOS_SENTADO_MAQUINA", "ISQUIOS_ACOSTADO_MAQUINA", "PANTORRILLA_GEMELOS_PRENSA"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 4 (Empuje B)", ["PECK_DECK_PECHO", "PECHO_FONDOS", "VUELOS_LATERALES_HOMBRO_POLEA", "FONDOS_HAMMER", "ABDOMEN_POLEA_OBLICUOS_ARRIBA"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 5 (Tracción B)", ["REMO_INFERIOR_POLEA", "JALON_LIBRE_POLEA", "REMO_DEPIE_POLEA", "CURL_BICEPS_POLEA", "PANTORRILLA_SENTADO_MAQUINA"], "2-3 Series", "6-10 Reps", "3-5 min")
              ]
          },
          {
              objective: "FUERZA - 6 DÍAS", days: 6,
              workout: [
                  buildDay("Día 1 (Empuje A)", ["BANCO_PLANO_HAMMER", "PECHO_INCLINADO_HAMMER", "PECK_DECK_HOMBRO", "FONDOS_HAMMER", "EXTENSION_VERTICAL_POLEA"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 2 (Tracción A)", ["REMO_HORIZONTAL_HAMMER", "JALON_VERTICAL_ABIERTO", "REMO_INFERIOR_POLEA", "CURL_BICEPS_UNILATERAL_PREDICADOR", "CURL_CONCENTRADO_POLEA"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 3 (Pierna A)", ["PRENSA_CUADRICEPS", "EXTENSIONES_CUADRICEPS", "INSQUIOS_SENTADO_MAQUINA", "PANTORRILLA_GEMELOS_PRENSA", "crunch_en_maquina"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 4 (Empuje B)", ["PECK_DECK_PECHO", "PECHO_FONDOS", "VUELOS_LATERALES_HOMBRO_POLEA", "PRESS_FRANCES_POLEA", "EXTENSION_POLEA_CUERDA"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 5 (Tracción B)", ["JALON_VERTICAL_NEUTRO", "REMO_DEPIE_POLEA", "JALON_LIBRE_POLEA", "CURL_BICEPS_POLEA", "CURL_ANTEBRAZO_PRONO_POLEA"], "2-3 Series", "6-10 Reps", "3-5 min"),
                  buildDay("Día 6 (Pierna B)", ["HACK_SENTADILLA_CUADRICEPS", "ISQUIOS_ACOSTADO_MAQUINA", "ABDUCCION_MAQUINA", "PANTORRILLA_SENTADO_MAQUINA", "rueda_abdominal_2"], "2-3 Series", "6-10 Reps", "3-5 min")
              ]
          },

          // ==========================================
          // OBJETIVO: RESISTENCIA (4-5 Series | 12-15 Reps | 1-3 min)
          // ==========================================
          {
              objective: "RESISTENCIA - 3 DÍAS", days: 3,
              workout: [
                  buildDay("Día 1 (Cardio 1)", ["BURPEE_CARDIO", "SALTO_CAJON", "JUMPING_JACK", "ESCALADORAS", "CRUNCH_ABDOMEN"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 2 (Full Body Libre)", ["GOBLET_SQUAT_CUADRICEPS", "PECHO_BANCO_PLANO", "REMO_MANCUERNAS_LIBRE", "PRESS_MILITAR_HOMBRO", "PESO_MUERTO_MANCUERNAS"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 3 (Cardio 2)", ["SALTOS_LARGOS", "BICICLETA_ACOSTADO", "TOQUES_LADO_A_LADO_EN_CONO", "MAQUINA_REMO_CARDIO", "rueda_abdominal_1"], "4-5 Series", "12-15 Reps", "1-3 min")
              ]
          },
          {
              objective: "RESISTENCIA - 4 DÍAS", days: 4,
              workout: [
                  buildDay("Día 1 (Cardio 1)", ["SALTO_EN_CAJON_Y_STEP", "BURPEE_CARDIO", "JUMPING_JACK", "ESCALADORAS", "plancha_lateral"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 2 (Libre A)", ["SENTADILLA_LIBRE_CUADRICEPS", "PECHO_INCLINADO_MANCUERNAS", "DOMINADAS", "ZANCADAS_MANCUERNAS", "VUELOS_LATERALES_HOMBRO_MEDIAL"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 3 (Cardio 2)", ["SALTOS_MANCUERNAS_BURPEE", "SALTOS_LATERALES_CON_CONOS", "MAQUINA_REMO_CARDIO", "BICICLETA_ACOSTADO", "crunch_balon_medicinal"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 4 (Libre B)", ["PESO_MUERTO_BARRA_CUADRICEPS", "FLEXION_DE_PECHO", "REMO_MANCUERNAS_INCLINADO", "PRESS_MILITAR_HOMBRO", "CURL_BICEPS_MANCUERNAS_ALTERNADO"], "4-5 Series", "12-15 Reps", "1-3 min")
              ]
          },
          {
              objective: "RESISTENCIA - 5 DÍAS", days: 5,
              workout: [
                  buildDay("Día 1 (Cardio 1)", ["BURPEE_CARDIO", "JUMPING_JACK", "ESCALADORAS", "BOXEO", "CRUNCH_ABDOMEN"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 2 (Pierna Libre)", ["GOBLET_SQUAT_CUADRICEPS", "PESO_MUERTO_MANCUERNAS", "DESPLANTES_MANCUERNAS", "GEMELOS_PANTORRILLA_DE_PIE", "rueda_abdominal_1"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 3 (Torso Libre A)", ["PECHO_BANCO_PLANO", "DOMINADAS_AGARRE_NEUTRO", "PRESS_MILITAR_HOMBRO", "COPAS_MANCUERNAS", "CURL_BICEPS_BARRA_AGARRE_ABIERTO"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 4 (Cardio 2)", ["SALTOS_LARGOS", "TOQUES_LADO_A_LADO_EN_CONO", "MAQUINA_REMO_CARDIO", "BICICLETA_ACOSTADO", "plancha_lateral"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 5 (Torso Libre B)", ["SENTADILLA_LIBRE_CUADRICEPS", "FLEXION_PECHO_UNAMANO", "REMO_BARRALIBRE_SUPINACION", "VUELOS_FRONTALES_MANCUERNA_HOMBRO", "PRESS_FRANCES_BARRA"], "4-5 Series", "12-15 Reps", "1-3 min")
              ]
          },
          {
              objective: "RESISTENCIA - 6 DÍAS", days: 6,
              workout: [
                  buildDay("Día 1 (Cardio 1)", ["BURPEE_CARDIO", "SALTO_CAJON", "JUMPING_JACK", "ESCALADORAS", "CRUNCH_ABDOMEN"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 2 (Pierna Libre A)", ["SENTADILLA_LIBRE_CUADRICEPS", "PESO_MUERTO_BARRA", "ZANCADAS_MANCUERNAS", "GEMELOS_PANTORRILLA_DE_PIE", "elevacion_de_piernas"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 3 (Torso Libre A)", ["PECHO_INCLINADO_MANCUERNAS", "REMO_MANCUERNAS_LIBRE", "VUELOS_LATERALES_HOMBRO_MEDIAL", "PRESS_FRANCES_MANCUERNAS_INCLINADO", "CURL_BICEPS_MANCUERNAS_ALTERNADO"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 4 (Cardio 2)", ["SALTOS_MANCUERNAS_BURPEE", "SALTOS_LATERALES_CON_CONOS", "MAQUINA_REMO_CARDIO", "BICICLETA_ACOSTADO", "crunch_balon_medicinal"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 5 (Pierna Libre B)", ["GOBLET_SQUAT_CUADRICEPS", "PESO_MUERTO_MANCUERNAS", "BÚLGARAS_MANCUERNAS", "PANTORRILLA_GEMELOS_SENTADO_MANCUERNA", "rueda_abdominal_2"], "4-5 Series", "12-15 Reps", "1-3 min"),
                  buildDay("Día 6 (Torso Libre B)", ["PECHO_PLANO_MANCUERNAS", "DOMINADAS", "PRESS_MILITAR_HOMBRO", "COPAS_MANCUERNAS", "CURL_BICEPS_BARRA_ROMANA"], "4-5 Series", "12-15 Reps", "1-3 min")
              ]
          }
      ];

      state.routineTemplates = defaultTXT;
      localStorage.setItem('gym_routine_templates', JSON.stringify(state.routineTemplates));
  }

  // REPARA PLANTILLAS YA GUARDADAS CUYOS EJERCICIOS QUEDARON SIN IMAGEN
  repairRoutineTemplates();

  renderNavbar();
  renderMainContent();
};

function migrateOldRoutines() {
    let updated = false;
    state.clients.forEach(client => {
        if(!client.plan) { client.plan = gymPlans[0]; updated = true; } 
        if(!client.plan.durationDays) { client.plan.durationDays = 30; updated = true; }
        if(!client.exerciseHistory) { client.exerciseHistory = {}; updated = true; }
        if(client.workout) {
            client.workout.forEach(day => {
                day.exercises.forEach(ex => {
                    const dict = exerciseDetails[ex.name];
                    if(dict) {
                        if(ex.img && (!ex.img.includes('ejercicios/') || ex.img.includes('http') || ex.img.includes('.gif'))) { ex.img = dict.img; updated = true; }
                        if(!ex.desc) { ex.desc = dict.desc; updated = true; }
                    }
                    if(!ex.rest) { ex.rest = "4-5 Minutos"; updated = true; }
                    if(!ex.desc && !dict) { ex.desc = "Sigue las indicaciones de tu entrenador para una correcta ejecución biomecánica."; updated = true; }
                });
            });
        }
        if(updated) syncClientToDB(client);
    });
}

function performSystemMaintenance() {
  let updated = false, historyUpdated = false;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  state.clients = state.clients.filter(client => {
    const dueDate = new Date(client.dueDate); dueDate.setHours(0, 0, 0, 0);
    const diffTime = today - dueDate; const daysExpired = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysExpired > 61) { 
        state.historyDB[client.cc] = client.evaluations; historyUpdated = true; updated = true; 
        deleteClientFromDB(client.cc);
        return false; 
    }
    if (daysExpired > 8 && client.status !== 'inactive') { 
        client.status = 'inactive'; updated = true; 
        syncClientToDB(client);
    }
    return true; 
  });

  if (historyUpdated) syncHistoryToDB();
  if (updated && state.currentUser && state.currentUser.role === 'client') {
      const stillActive = state.clients.find(c => c.cc === state.currentUser.cc && c.status !== 'inactive');
      if (!stillActive) { state.currentUser = null; localStorage.removeItem('gym_session'); }
  }
}

// ==========================================
// NAVEGACIÓN Y RENDERIZADO PRINCIPAL
// ==========================================
function renderNavbar() {
  const container = document.getElementById('nav-actions');
  if (!state.currentUser) {
    container.innerHTML = `<button onclick="showMainLoginFlow()" class="btn-depth bg-transparent border border-cyan-500/80 text-cyan-400 hover:bg-cyan-500 hover:text-black px-6 py-2.5 rounded-full text-sm font-bold transition-all uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.3)]"><i class="fa-solid fa-user-astronaut"></i> Entrar</button>`;
  } else {
    container.innerHTML = `
      <span class="text-xs md:text-sm text-zinc-300 flex items-center gap-2 inner-depth px-4 py-2 rounded-xl border border-cyan-500/20"><i class="fa-solid ${state.currentUser.role === 'admin' ? 'fa-user-shield text-yellow-400' : 'fa-user text-cyan-400'}"></i><strong class="text-white">${state.currentUser.name}</strong></span>
      <button onclick="logout()" class="btn-depth bg-red-900/60 border border-red-500/50 text-red-100 px-4 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-red-600 transition shadow-[0_0_10px_rgba(239,68,68,0.3)]"><i class="fa-solid fa-right-from-bracket"></i></button>
    `;
  }
}

function renderMainContent() {
  const main = document.getElementById('app-content');
  let content = '';
  if (!state.currentUser) { content = renderLandingPage(); } 
  else if (state.currentUser.role === 'admin') {
    if (state.viewingClientAsAdmin) { content = renderClientPortal(); setTimeout(initProgressChart, 100); } 
    else { content = renderAdminDashboard(); }
  } else { content = renderClientPortal(); setTimeout(initProgressChart, 100); }
  
  let footer = '';
  if(!state.currentUser) {
      footer = `
        <footer class="mt-16 py-8 border-t border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-6 text-zinc-400 text-sm bg-[#030303] px-8 rounded-[2rem] shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-zinc-800">
            <div class="flex items-center gap-4 hover:scale-105 transition-transform">
                <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white text-2xl shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                    <i class="fa-brands fa-instagram"></i>
                </div>
                <a href="https://www.instagram.com/gym____finity?srtk=Z3E0Yndqc2NmdHhj" target="_blank" class="font-black text-white hover:text-pink-400 transition tracking-widest uppercase text-base drop-shadow-md">@gym__finity</a>
            </div>
            <div class="text-center md:text-right flex flex-col gap-1">
                <p class="font-bold text-white drop-shadow-md text-base"><i class="fa-solid fa-location-dot text-red-500 mr-1 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"></i> Cra 14#104-05 sur Usminia</p>
                <a href="https://maps.app.goo.gl/uxurEsSw4Vm6HCAj7?g_st=ac" target="_blank" class="text-xs text-cyan-400 hover:text-cyan-300 underline font-black inline-block mt-1 transition drop-shadow-[0_0_5px_rgba(0,229,255,0.4)]">
                    Mostrar en Google Maps <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-[10px]"></i>
                </a>
            </div>
        </footer>
      `;
  }
  
  main.innerHTML = content + footer;
}

// ==========================================
// CONTROLADOR DEL SLIDER DE PRODUCTOS
// ==========================================
window.changeProduct = function(offset) {
    state.currentProductIndex += offset;
    if (state.currentProductIndex < 0) state.currentProductIndex = storeProducts.length - 1;
    if (state.currentProductIndex >= storeProducts.length) state.currentProductIndex = 0;
    renderMainContent();
};

// ==========================================
// NUEVO: GENERADOR IA AVANZADO
// ==========================================
window.showRoutineGeneratorModal = function() {
    openModal(`
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-lg font-bold text-yellow-400 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]"><i class="fa-solid fa-wand-magic-sparkles"></i> Generar Nueva Rutina</h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <form onsubmit="handleGenerateRoutine(event)" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">¿Cuál es el Objetivo?</label>
                <select id="rg_obj" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3.5 text-sm text-white font-medium focus:border-yellow-400 outline-none transition">
                    <option value="Hipertrofia">Hipertrofia (Ganar Masa Muscular)</option>
                    <option value="Bajar Grasa">Déficit Calórico (Bajar Grasa)</option>
                    <option value="Fuerza">Ganar Fuerza</option>
                    <option value="Tren Inferior">Aumentar Masa en Tren Inferior (Glúteos/Pierna)</option>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Días a la semana</label>
                    <select id="rg_day" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3.5 text-sm text-white font-medium focus:border-yellow-400 outline-none transition">
                        <option value="3">3 Días</option>
                        <option value="4" selected>4 Días</option>
                        <option value="5">5 Días</option>
                        <option value="6">6 Días</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Nivel</label>
                    <select id="rg_lvl" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3.5 text-sm text-white font-medium focus:border-yellow-400 outline-none transition">
                        <option value="Principiante">Principiante</option>
                        <option value="Intermedio" selected>Intermedio</option>
                        <option value="Avanzado">Avanzado</option>
                    </select>
                </div>
            </div>
            <div class="bg-red-900/20 border border-red-500/30 p-3 rounded-xl mt-4">
                <p class="text-xs text-red-400 font-bold text-center"><i class="fa-solid fa-triangle-exclamation"></i> Atención: Esto reemplazará la rutina actual del usuario.</p>
            </div>
            <button type="submit" class="w-full btn-depth bg-yellow-400 text-black font-extrabold py-4 rounded-xl text-sm mt-2 shadow-[0_0_15px_rgba(255,215,0,0.4)]">Crear Rutina</button>
        </form>
    `);
}

window.handleGenerateRoutine = function(e) {
    e.preventDefault();
    const obj = document.getElementById('rg_obj').value;
    const days = parseInt(document.getElementById('rg_day').value);
    const lvl = document.getElementById('rg_lvl').value;
    
    const loader = document.getElementById('loading-screen');
    if(loader) {
        loader.classList.remove('hide-loader'); loader.style.opacity = '1'; loader.style.visibility = 'visible'; loader.style.zIndex = '100000';
        loader.querySelector('h1').innerHTML = '<span class="text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] animate-pulse">CREANDO NUEVA RUTINA...</span>';
    }

    setTimeout(() => {
        const newWorkout = generateAiWorkoutCustom(obj, days, lvl);
        state.selectedClientRecord.workout = newWorkout;
        state.selectedClientRecord.days = days;
        state.selectedClientRecord.level = lvl;
        syncClientToDB(state.selectedClientRecord);
        
        if(loader) { 
            loader.classList.add('hide-loader'); 
            setTimeout(() => { loader.querySelector('h1').innerHTML = '<span class="text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">GYM</span> <span class="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]">FINITY</span>'; loader.style = ''; }, 600); 
        }
        closeModal(); 
        renderMainContent();
    }, 800);
}

function generateAiWorkoutCustom(objective, days, level) {
    const getEx = (name) => {
        const e = exerciseDetails[name] || { img: "ejercicios/default.png", desc: "Sigue las indicaciones de tu entrenador." };
        return { name, img: e.img, desc: e.desc };
    };
    
    let sets = "4 Series", reps = "10-12 Reps", rest = "90 Segundos";
    
    if (objective === "Fuerza") { sets = "5 Series"; reps = "5-8 Reps"; rest = "3 Minutos"; }
    if (objective === "Bajar Grasa") { reps = "15-20 Reps"; rest = "45 Segundos"; }
    if (level === "Principiante") { sets = "3 Series"; }

    const workout = [];
    if (objective === "Tren Inferior") {
        workout.push({ day: "Día 1: Cuádriceps y Glúteo", exercises: [{...getEx("Sentadilla Profunda con Barra"), sets, reps, rest}, {...getEx("Extensión de Cuádriceps"), sets, reps, rest}, {...getEx("Abductores"), sets, reps, rest}] });
        workout.push({ day: "Día 2: Tren Superior", exercises: [{...getEx("Press Banco Plano"), sets, reps, rest}, {...getEx("Jalón Vertical Abierto"), sets, reps, rest}, {...getEx("Crunch en Banco"), sets, reps, rest}] });
        workout.push({ day: "Día 3: Isquios y Glúteo", exercises: [{...getEx("Peso Muerto"), sets, reps, rest}, {...getEx("Curl Femoral"), sets, reps, rest}, {...getEx("Elevación de Pelvis"), sets, reps, rest}] });
        if(days > 3) workout.push({ day: "Día 4: Hombro y Abdomen", exercises: [{...getEx("Press Hombro"), sets, reps, rest}, {...getEx("Rueda Abdominal"), sets, reps, rest}] });
        if(days > 4) workout.push({ day: "Día 5: Pierna Completa", exercises: [{...getEx("Sentadilla Hacka"), sets, reps, rest}, {...getEx("Curl Femoral"), sets, reps, rest}] });
        if(days > 5) workout.push({ day: "Día 6: Brazos", exercises: [{...getEx("Curl Bíceps Barra Abierto"), sets, reps, rest}, {...getEx("Fondos en Paralelas"), sets, reps, rest}] });
    } else {
        workout.push({ day: "Día 1: Pecho y Tríceps", exercises: [{...getEx("Press Banco Plano"), sets, reps, rest}, {...getEx("Press Inclinado con Barra"), sets, reps, rest}, {...getEx("Fondos en Paralelas"), sets, reps, rest}] });
        workout.push({ day: "Día 2: Espalda y Bíceps", exercises: [{...getEx("Dominadas"), sets, reps, rest}, {...getEx("Remo Horizontal Abierto"), sets, reps, rest}, {...getEx("Curl Bíceps Barra Abierto"), sets, reps, rest}] });
        workout.push({ day: "Día 3: Piernas", exercises: [{...getEx("Sentadilla Profunda con Barra"), sets, reps, rest}, {...getEx("Peso Muerto"), sets, reps, rest}, {...getEx("Extensión de Cuádriceps"), sets, reps, rest}] });
        if(days > 3) workout.push({ day: "Día 4: Hombro y Core", exercises: [{...getEx("Press Hombro"), sets, reps, rest}, {...getEx("Face Pull"), sets, reps, rest}] });
        if(days > 4) workout.push({ day: "Día 5: Pecho y Espalda", exercises: [{...getEx("Peck Deck"), sets, reps, rest}, {...getEx("Jalón Vertical Abierto"), sets, reps, rest}] });
        if(days > 5) workout.push({ day: "Día 6: Pierna Isquios", exercises: [{...getEx("Peso Muerto"), sets, reps, rest}, {...getEx("Curl Femoral"), sets, reps, rest}] });
    }
    return workout.slice(0, days);
}

// Función por defecto para crear usuarios nuevos
function generateAiWorkout(objective, days, level, machines) {
    return generateAiWorkoutCustom(objective, days, level);
}

// ==========================================
// EXPORTACIÓN A PDF (TARJETA COMPACTA Y TEXTO ACTUALIZADO)
// ==========================================
window.downloadPDF = function() {
    const clientData = state.viewingClientAsAdmin ? state.selectedClientRecord : (state.clients.find(c => c.cc === state.currentUser.cc) || state.currentUser.record);
    if (!clientData || !clientData.workout) return alert("No hay rutina para descargar.");

    const loader = document.getElementById('loading-screen');
    if(loader) {
        loader.classList.remove('hide-loader'); loader.style.opacity = '1'; loader.style.visibility = 'visible'; loader.style.zIndex = '100000';
        // 1. TEXTO ACTUALIZADO A "GENERANDO PDF..."
        loader.querySelector('h1').innerHTML = '<span class="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.8)] animate-pulse">GENERANDO PDF...</span>';
    }

    const pdfWrapper = document.createElement('div');
    pdfWrapper.id = 'pdf-print-wrapper';
    Object.assign(pdfWrapper.style, {
        width: '800px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Arial, sans-serif'
    });
    
    const fallbackBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    let html = '';

    clientData.workout.forEach((day, dIdx) => {
        const isFirst = dIdx === 0;

        html += `
            <div style="width: 100%; padding: 40px; box-sizing: border-box; position: relative; background: #ffffff;">
                
                <div style="position: absolute; top: 500px; left: 50%; transform: translate(-50%, -50%); width: 500px; height: 500px; opacity: 0.12; pointer-events: none; z-index: 1; display: flex; align-items: center; justify-content: center;">
                    <img src="LOG.PNG" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='LOGO.PNG';" />
                </div>
        `;

        if (isFirst) {
            html += `
                <img src="LOGO.PNG" style="position: absolute; top: 35px; left: 40px; width: 75px; height: 75px; border-radius: 50%; border: 3px solid #0f172a; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 10;" onerror="this.onerror=null; this.src='LOGO.jpg';" />
                <img src="LOGO.PNG" style="position: absolute; top: 35px; right: 40px; width: 75px; height: 75px; border-radius: 50%; border: 3px solid #0f172a; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 10;" onerror="this.onerror=null; this.src='LOGO.jpg';" />
                
                <div style="text-align: center; padding-bottom: 5px; margin-bottom: 20px; position: relative; z-index: 10;">
                    <h1 style="font-size: 48px; font-weight: 900; margin: 0; letter-spacing: 1px;">
                        <span style="color: #eab308; -webkit-text-stroke: 1.5px #0f172a; text-shadow: 3px 3px 0px rgba(0,0,0,0.1);">GYM</span><span style="color: #06b6d4; -webkit-text-stroke: 1.5px #0f172a; text-shadow: 3px 3px 0px rgba(0,0,0,0.1);">FINITY</span>
                    </h1>
                    <p style="font-size: 14px; color: #334155; margin-top: 4px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px;">Plan de Entrenamiento Oficial</p>
                    <div style="display: flex; justify-content: center; gap: 6px; margin-top: 15px;">
                        <div style="width: 40px; height: 5px; background: #06b6d4; border-radius: 2px;"></div>
                        <div style="width: 40px; height: 5px; background: #eab308; border-radius: 2px;"></div>
                        <div style="width: 40px; height: 5px; background: #0f172a; border-radius: 2px;"></div>
                        <div style="width: 40px; height: 5px; background: #06b6d4; border-radius: 2px;"></div>
                        <div style="width: 40px; height: 5px; background: #eab308; border-radius: 2px;"></div>
                    </div>
                </div>

                <!-- 2. TARJETA ATLETA (MÁS PEQUEÑA Y COMPACTA PARA AHORRAR ESPACIO VERTICAL) -->
                <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 18px; border-radius: 12px; border: 2px solid #cbd5e1; margin-bottom: 25px; position: relative; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                    <div style="background: #0f172a; padding: 8px 16px; border-radius: 8px; border-left: 4px solid #06b6d4;">
                        <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 900;">Atleta</p>
                        <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: 900; color: #ffffff; text-transform: uppercase;">${clientData.name}</p>
                    </div>
                    <div style="background: #0f172a; padding: 8px 16px; border-radius: 8px; border-right: 4px solid #eab308; text-align: right;">
                        <p style="margin: 0; font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 900;">Plan Asignado</p>
                        <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: 900; color: #ffffff; text-transform: uppercase;">${clientData.plan ? clientData.plan.id : 'Rutina Base'}</p>
                    </div>
                </div>
            `;
        } else {
            html += `
                <img src="LOGO.PNG" style="position: absolute; top: 35px; left: 40px; width: 75px; height: 75px; border-radius: 50%; border: 3px solid #0f172a; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 10;" onerror="this.onerror=null; this.src='LOGO.jpg';" />
                <img src="LOGO.PNG" style="position: absolute; top: 35px; right: 40px; width: 75px; height: 75px; border-radius: 50%; border: 3px solid #0f172a; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 10;" onerror="this.onerror=null; this.src='LOGO.jpg';" />
                
                <div style="height: 80px;"></div> 
            `;
        }

        html += `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 25px; background: #0f172a; border-radius: 12px; padding: 14px 20px; border-left: 6px solid #eab308; border-right: 6px solid #06b6d4; position: relative; z-index: 10; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                <div style="background: #eab308; padding: 5px 10px; border-radius: 8px; color: #000; font-weight: 900; font-size: 15px;">📅</div>
                <h2 style="font-size: 20px; font-weight: 900; color: #ffffff; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${day.day}</h2>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 25px; position: relative; z-index: 10;">
        `;

        day.exercises.forEach((ex, idx) => {
            const themeColor = idx % 2 === 0 ? '#06b6d4' : '#eab308'; 
            const explanation = ex.desc || 'Mantén la postura firme, controla la respiración y enfócate en la técnica del movimiento.';
            html += `
                <div style="display: flex; align-items: stretch; border: 2px solid ${themeColor}; border-radius: 16px; padding: 15px; background: #ffffff; gap: 20px; page-break-inside: avoid; box-shadow: 0 6px 15px rgba(0,0,0,0.06); position: relative; overflow: hidden;">
                    
                    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: ${themeColor};"></div>

                    <div style="width: 110px; height: 110px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 5px; margin-left: 8px; align-self: center;">
                        <img src="${ex.img}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="gymImgFix(this)" />
                    </div>
                    
                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                        <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">${idx + 1}. ${ex.name}</p>
                        
                        <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 8px 12px; border-radius: 8px; color: #ffffff; text-align: center; min-width: 75px; box-shadow: 0 2px 6px rgba(6,182,212,0.3);">
                                <span style="display: block; font-size: 9px; text-transform: uppercase; font-weight: 900; opacity: 0.9; margin-bottom: 2px;">Series</span>
                                <span style="font-size: 15px; font-weight: 900;">${ex.sets}</span>
                            </div>
                            <div style="background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); padding: 8px 12px; border-radius: 8px; color: #000000; text-align: center; min-width: 75px; box-shadow: 0 2px 6px rgba(234,179,8,0.3);">
                                <span style="display: block; font-size: 9px; text-transform: uppercase; font-weight: 900; opacity: 0.8; margin-bottom: 2px;">Reps</span>
                                <span style="font-size: 15px; font-weight: 900;">${ex.reps}</span>
                            </div>
                            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 8px 12px; border-radius: 8px; color: #ffffff; text-align: center; min-width: 90px; box-shadow: 0 2px 6px rgba(15,23,42,0.3);">
                                <span style="display: block; font-size: 9px; text-transform: uppercase; font-weight: 900; color: #38bdf8; margin-bottom: 2px;">⏱️ Descanso</span>
                                <span style="font-size: 14px; font-weight: 900;">${ex.rest || '2 Min'}</span>
                            </div>
                        </div>

                        <div style="background: #f8fafc; border-left: 3px solid ${themeColor}; padding: 8px 12px; border-radius: 0 6px 6px 0;">
                            <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.4; font-weight: 600;">
                                <strong style="color: #0f172a; font-size: 11px; text-transform: uppercase;">Técnica:</strong> ${explanation}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`; 

        if (dIdx < clientData.workout.length - 1) {
            html += `<div class="html2pdf__page-break"></div>`;
        }
    });

    html += `
        <div style="padding: 0 40px 30px 40px; page-break-inside: avoid; background: #ffffff;">
            <div style="text-align: center; border-top: 2px dashed #cbd5e1; padding-top: 20px;">
                <p style="margin: 0; font-size: 12px; color: #475569; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">Gym Finity Pro • Cra 14#104-05 sur Usminia</p>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #06b6d4; font-weight: 900; letter-spacing: 1px;">Instagram: @gym__finity</p>
            </div>
        </div>
    `;

    pdfWrapper.innerHTML = html;

    const appNav = document.querySelector('nav');
    const appContent = document.getElementById('app-content');
    const appFooter = document.querySelector('footer');
    const waBtn = document.getElementById('whatsapp-btn') || document.querySelector('.btn-whatsapp');
    const toastCont = document.getElementById('toast-container');

    if(appNav) appNav.style.display = 'none';
    if(appContent) appContent.style.display = 'none';
    if(appFooter) appFooter.style.display = 'none';
    if(waBtn) waBtn.style.display = 'none';
    if(toastCont) toastCont.style.display = 'none';

    document.body.style.backgroundColor = '#ffffff'; 
    document.body.appendChild(pdfWrapper);

    const images = pdfWrapper.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => new Promise(resolve => {
        if (img.complete) return resolve();
        img.onload = resolve;
        img.onerror = resolve; 
    }));

    Promise.all(imagePromises).then(() => {
        window.scrollTo(0, 0); 

        html2pdf().set({
            margin: 0,
            filename: `Rutina_${clientData.name.replace(/\s+/g, '_').toUpperCase()}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        }).from(pdfWrapper).save().then(() => {
            
            document.body.removeChild(pdfWrapper);
            document.body.style.backgroundColor = '#020202'; 
            
            if(appNav) appNav.style.display = '';
            if(appContent) appContent.style.display = '';
            if(appFooter) appFooter.style.display = '';
            if(waBtn) waBtn.style.display = '';
            if(toastCont) toastCont.style.display = '';

            if(loader) { 
                loader.classList.add('hide-loader'); 
                setTimeout(() => { 
                    loader.querySelector('h1').innerHTML = '<span class="text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">GYM</span> <span class="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]">FINITY</span>'; 
                    loader.style = ''; 
                }, 600); 
            }
        });
    });
};
// ==========================================
// MODAL DETALLADO DE EJERCICIO (SERIES, REPS, GRÁFICA Y COLOR DE PLAN)
// ==========================================
window.openExerciseModal = function(dayIndex, exerciseIndex) {
    const isAdminViewing = state.viewingClientAsAdmin; 
    const clientData = isAdminViewing ? state.selectedClientRecord : (state.clients.find(c => c.cc === state.currentUser.cc) || state.currentUser.record);
    
    if (!clientData || !clientData.workout || !clientData.workout[dayIndex]) {
        console.error("No se encontró el registro del cliente o del entrenamiento.");
        return;
    }

    const day = clientData.workout[dayIndex];
    const ex = day.exercises[exerciseIndex];
    
    // Inicializar historial si no existe
    clientData.exerciseHistory = clientData.exerciseHistory || {};
    if (!clientData.exerciseHistory[ex.name]) clientData.exerciseHistory[ex.name] = [];
    
    const hasNext = (exerciseIndex + 1) < day.exercises.length;
    const suggestedSets = parseInt(ex.sets) || 4;
    const fallbackBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    
    // Obtener el color REAL del plan del usuario
    const userPlan = clientData.plan || (typeof gymPlans !== 'undefined' ? gymPlans[0] : {color: '#ffffff'});
    const effColor = userPlan.color || '#ffffff';
    const safeExName = ex.name.replace(/'/g, "\\'");

    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 md:p-10 max-w-lg mx-auto w-full animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar" style="border-color: ${effColor};">
            
            <!-- BOTÓN CERRAR MINIMALISTA -->
            <button onclick="closeModal()" class="absolute top-5 right-5 w-9 h-9 bg-[#0a0a0a]/80 backdrop-blur-sm border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all z-50 shadow-md">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>

            <div class="flex flex-col items-center gap-5 mt-2">
                
                <!-- IMAGEN DEL EJERCICIO -->
                <div class="w-full bg-white rounded-2xl p-4 flex justify-center items-center border-2 shadow-[0_0_20px_rgba(255,255,255,0.05)]" style="border-color: ${effColor};">
                    <img src="${ex.img}" class="w-full max-h-56 object-contain mix-blend-multiply" onerror="gymImgFix(this)" />
                </div>
                
                <div class="text-center w-full">
                    <h3 class="text-2xl md:text-3xl font-black text-white uppercase tracking-wider drop-shadow-md mb-1" style="color: ${effColor};">${ex.name}</h3>
                    <p class="text-xs text-zinc-400 font-bold mb-4" id="sets-counter">0/${suggestedSets} series terminadas</p>
                    
                    <!-- CUADROS DE INFO -->
                    <div class="grid grid-cols-2 gap-3 w-full mb-2">
                        <div class="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-md">
                            <i class="fa-solid fa-layer-group text-xl mb-1" style="color: ${effColor}; filter: drop-shadow(0 0 5px ${effColor}80);"></i>
                            <span class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Series</span>
                            <span class="text-lg font-black text-white">${ex.sets}</span>
                        </div>
                        <div class="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-md">
                            <i class="fa-solid fa-repeat text-xl mb-1" style="color: ${effColor}; filter: drop-shadow(0 0 5px ${effColor}80);"></i>
                            <span class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Reps</span>
                            <span class="text-lg font-black text-white">${ex.reps}</span>
                        </div>
                        <div class="col-span-2 bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-md">
                            <i class="fa-solid fa-stopwatch text-xl mb-1" style="color: ${effColor}; filter: drop-shadow(0 0 5px ${effColor}80);"></i>
                            <span class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Descanso</span>
                            <span class="text-lg font-black text-white">${ex.rest || '4-5 Min'}</span>
                        </div>
                    </div>
                    
                    <!-- TÉCNICA -->
                    <div class="mt-3 text-left bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                        <h4 class="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2"><i class="fa-solid fa-circle-info" style="color: ${effColor};"></i> Técnica</h4>
                        <p class="text-xs text-zinc-300 leading-relaxed font-medium">${ex.desc || 'Sigue las indicaciones de tu entrenador.'}</p>
                    </div>

                    <!-- REGISTRO DE CARGAS -->
                    <div class="mt-4 border-t border-zinc-800/80 pt-5 w-full text-left">
                        <h4 class="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-dumbbell" style="color: ${effColor};"></i> Registro de Cargas
                        </h4>

                        ${!isAdminViewing ? `
                        <div class="grid grid-cols-[auto_1fr_1fr] gap-3 mb-2 px-2 text-[10px] font-black text-zinc-500 uppercase tracking-wider text-center">
                            <div class="w-6 md:w-8">Set</div><div>Peso</div><div>Reps</div>
                        </div>

                        <div id="sets-container" class="flex flex-col gap-2 mb-4 custom-scrollbar max-h-[30vh] overflow-y-auto pr-1"></div>

                        ` : `
                        <div class="bg-red-900/10 border border-red-500/30 rounded-xl p-4 text-center mb-6 shadow-inner">
                            <span class="text-xs font-bold text-red-400 uppercase tracking-widest"><i class="fa-solid fa-triangle-exclamation"></i> Solo el usuario puede registrar series y peso.</span>
                        </div>
                        `}

                        <!-- BOTÓN GRÁFICA -->
                        <button onclick="toggleExerciseChart('${safeExName}')" type="button" class="w-full bg-[#0a0a0a] border border-zinc-800 text-zinc-400 hover:text-white py-3 mb-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 hover:bg-zinc-900 shadow-sm">
                            <i class="fa-solid fa-chart-line" style="color: ${effColor};"></i> Ver Gráfica de Progreso <i id="ex-chart-toggle-icon" class="fa-solid fa-chevron-down ml-1 transition-transform"></i>
                        </button>
                        
                        <!-- CONTENEDOR GRÁFICA -->
                        <div id="ex-chart-wrapper" class="hidden bg-black/50 rounded-xl p-4 mb-6 border border-zinc-800 shadow-inner animate-fade-in">
                            <p class="text-[10px] text-zinc-500 font-bold uppercase mb-3 tracking-widest text-center">Evolución (Carga Máx)</p>
                            <div class="h-32 w-full relative"><canvas id="exerciseChart"></canvas></div>
                        </div>

                        <!-- BOTONES ACCIÓN -->
                        <div class="flex flex-col gap-3">
                            ${!isAdminViewing ? `
                            <button id="save-workout-btn" type="button" class="w-full py-3.5 rounded-xl bg-[#0a0a0a] text-zinc-300 font-black uppercase tracking-wider border border-zinc-700 hover:text-white transition-all flex items-center justify-center gap-2 shadow-md">
                                <i class="fa-solid fa-save"></i> Guardar Serie
                            </button>
                            ` : ''}
                            
                            ${hasNext ? `
                            <button id="save-next-btn" type="button" class="w-full py-3.5 rounded-xl text-black font-black uppercase tracking-wider transition-transform hover:scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2" style="background-color: ${effColor};">
                                Siguiente Ejercicio <i class="fa-solid fa-arrow-right"></i>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    openModal(html);

    // Lógica interna para clientes
    if (!isAdminViewing) {
        const setsContainer = document.getElementById('sets-container');
        let setsData = [];
        const history = clientData.exerciseHistory[ex.name] || [];
        const lastWorkout = history.length > 0 ? history[history.length - 1].sets : null;

        for(let i = 0; i < suggestedSets; i++) {
            setsData.push({
                weight: lastWorkout && lastWorkout[i] ? lastWorkout[i].weight : '',
                reps: lastWorkout && lastWorkout[i] ? lastWorkout[i].reps : (ex.reps.match(/\d+/)?.[0] || '10')
            });
        }

        function renderSetsUI() {
            setsContainer.innerHTML = '';
            setsData.forEach((set, i) => {
                const row = document.createElement('div');
                row.className = 'flex items-center gap-2 md:gap-3 bg-[#0a0a0a] p-2 rounded-xl border border-zinc-800 transition-colors duration-300';
                row.innerHTML = `
                    <div class="w-6 md:w-8 flex justify-center">
                        <div class="set-indicator w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-zinc-600 flex items-center justify-center text-[10px] md:text-xs font-bold text-zinc-400 transition-all">${i + 1}</div>
                    </div>
                    <div class="flex-1 flex items-center bg-black/60 rounded-lg p-1.5 border border-zinc-800/80 focus-within:border-white transition-colors">
                        <input type="number" step="0.5" class="set-weight w-full bg-transparent text-white text-center font-bold text-sm md:text-base outline-none appearance-none" placeholder="-" value="${set.weight}">
                        <span class="text-[9px] md:text-[10px] text-zinc-500 font-black pr-1 uppercase">KG</span>
                    </div>
                    <div class="flex-1 flex items-center bg-black/60 rounded-lg p-1.5 border border-zinc-800/80 focus-within:border-white transition-colors">
                        <input type="number" class="set-reps w-full bg-transparent text-white text-center font-bold text-sm md:text-base outline-none appearance-none" placeholder="-" value="${set.reps}">
                        <span class="text-[9px] md:text-[10px] text-zinc-500 font-black pr-1 uppercase">REPS</span>
                    </div>
                `;

                const indicator = row.querySelector('.set-indicator');
                const wInput = row.querySelector('.set-weight');
                const rInput = row.querySelector('.set-reps');

                const checkDone = () => {
                    if(wInput.value !== '' && rInput.value !== '') {
                        indicator.innerHTML = '<i class="fa-solid fa-check"></i>';
                        indicator.style.backgroundColor = effColor;
                        indicator.style.borderColor = effColor;
                        indicator.style.color = (effColor === '#E5E7EB' || effColor === '#FFD700' || effColor === '#D4D4D8' || effColor === '#ffffff') ? '#000' : '#fff';
                        indicator.style.boxShadow = `0 0 8px ${effColor}80`;
                        row.style.borderColor = effColor + '50';
                        row.classList.add('is-completed');
                    } else {
                        indicator.innerHTML = i + 1;
                        indicator.style = '';
                        row.style.borderColor = '';
                        row.classList.remove('is-completed');
                    }
                    const doneCount = setsContainer.querySelectorAll('.is-completed').length;
                    const counterEl = document.getElementById('sets-counter');
                    if(counterEl) counterEl.innerText = `${doneCount}/${setsData.length} series terminadas`;
                };

                wInput.addEventListener('input', checkDone);
                rInput.addEventListener('input', checkDone);
                checkDone();
                setsContainer.appendChild(row);
            });
        }

        renderSetsUI();

        const addSetBtn = document.getElementById('add-set-btn');
        if(addSetBtn) {
            addSetBtn.onclick = () => {
                setsData.push({weight: '', reps: ''});
                renderSetsUI();
                setsContainer.scrollTop = setsContainer.scrollHeight;
            };
        }

        function guardarEntrenamientoYContinuar(goNext) {
            const rows = setsContainer.children;
            const currentSets = [];
            let maxW = 0;
            
            for(let i = 0; i < rows.length; i++) {
                const wVal = rows[i].querySelector('.set-weight').value;
                const rVal = rows[i].querySelector('.set-reps').value;
                const w = parseFloat(wVal);
                const r = parseInt(rVal);
                
                if(!isNaN(w) && !isNaN(r)) {
                    currentSets.push({weight: w, reps: r});
                    if(w > maxW) maxW = w; 
                }
            }

            if(currentSets.length > 0) {
                const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
                
                clientData.exerciseHistory[ex.name] = history.filter(h => h.date !== today);
                clientData.exerciseHistory[ex.name].push({
                    date: today,
                    weight: maxW, 
                    sets: currentSets 
                });
                
                if(typeof syncClientToDB === 'function') {
                    syncClientToDB(clientData); 
                }
            } else if(!goNext) {
                alert("Por favor completa al menos una serie (Peso y Reps).");
                return;
            }

            const btnId = goNext && hasNext ? 'save-next-btn' : 'save-workout-btn';
            const btn = document.getElementById(btnId);
            if(btn) btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> ¡LISTO!';
            
            setTimeout(() => {
                if(goNext && hasNext) {
                    openExerciseModal(dayIndex, exerciseIndex + 1); 
                } else {
                    closeModal(); 
                    if(typeof renderMainContent === 'function') renderMainContent();
                }
            }, 300);
        }

        const saveBtn = document.getElementById('save-workout-btn');
        if(saveBtn) {
            saveBtn.onclick = () => guardarEntrenamientoYContinuar(false);
        }
    }

    const nextBtn = document.getElementById('save-next-btn');
    if(nextBtn) {
        nextBtn.onclick = () => {
            if(!isAdminViewing) {
                window.guardarEntrenamientoTemp ? window.guardarEntrenamientoTemp(true) : nextExerciseAction(dayIndex, exerciseIndex);
            } else {
                openExerciseModal(dayIndex, exerciseIndex + 1);
            }
        };
    }

    // Auxiliar interna para guardar desde el botón Siguiente
    window.guardarEntrenamientoTemp = function(goNext) {
        const setsContainer = document.getElementById('sets-container');
        if(!setsContainer) {
            if(goNext && hasNext) openExerciseModal(dayIndex, exerciseIndex + 1);
            return;
        }
        const rows = setsContainer.children;
        const currentSets = [];
        let maxW = 0;
        const history = clientData.exerciseHistory[ex.name] || [];

        for(let i = 0; i < rows.length; i++) {
            const w = parseFloat(rows[i].querySelector('.set-weight').value);
            const r = parseInt(rows[i].querySelector('.set-reps').value);
            if(!isNaN(w) && !isNaN(r)) {
                currentSets.push({weight: w, reps: r});
                if(w > maxW) maxW = w; 
            }
        }

        if(currentSets.length > 0) {
            const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
            clientData.exerciseHistory[ex.name] = history.filter(h => h.date !== today);
            clientData.exerciseHistory[ex.name].push({ date: today, weight: maxW, sets: currentSets });
            if(typeof syncClientToDB === 'function') syncClientToDB(clientData);
        }

        if(goNext && hasNext) {
            openExerciseModal(dayIndex, exerciseIndex + 1);
        }
    };
};

// ==========================================
// CONTROL DE VISIBILIDAD DE LA GRÁFICA
// ==========================================
window.toggleExerciseChart = function(exName) {
    const wrapper = document.getElementById('ex-chart-wrapper');
    const icon = document.getElementById('ex-chart-toggle-icon');
    
    if (!wrapper || !icon) return;

    if (wrapper.classList.contains('hidden')) {
        wrapper.classList.remove('hidden');
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        updateExerciseChart(exName);
    } else {
        wrapper.classList.add('hidden');
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
};

// ==========================================
// RENDERIZADO DE LA GRÁFICA CON EL COLOR EXACTO DEL PLAN DEL USUARIO
// ==========================================
window.updateExerciseChart = function(exName) {
    const isAdminViewing = state.viewingClientAsAdmin; 
    const clientData = isAdminViewing ? state.selectedClientRecord : (state.clients.find(c => c.cc === state.currentUser.cc) || state.currentUser.record);
    
    if (!clientData) return;

    // 1. Buscamos el plan del usuario de forma inteligente
    let userPlanName = clientData.plan;
    let exactPlanColor = '#D4D4D8'; // Color platinado por defecto para Silver

    if (typeof gymPlans !== 'undefined' && Array.isArray(gymPlans)) {
        // Si clientData.plan es un objeto o un string, intentamos empatarlo con gymPlans
        const matchedPlan = gymPlans.find(p => p.name === userPlanName || p.name === clientData.plan?.name);
        if (matchedPlan) {
            exactPlanColor = matchedPlan.color;
        } else if (typeof clientData.plan === 'object' && clientData.plan?.color) {
            exactPlanColor = clientData.plan.color;
        }
    } else if (typeof clientData.plan === 'object' && clientData.plan?.color) {
        exactPlanColor = clientData.plan.color;
    }

    // Corrección estética: Si el color del plan es grafito/oscuro, lo pasamos a plata brillante para que se note
    if (exactPlanColor === '#18181B' || exactPlanColor === '#000000') {
        exactPlanColor = '#D4D4D8';
    }

    // 2. Convertidor seguro de HEX a RGBA para el sombreado de fondo
    let bgColorWithAlpha = exactPlanColor;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(exactPlanColor)) {
        let c = exactPlanColor.substring(1).split('');
        if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        c = '0x' + c.join('');
        bgColorWithAlpha = 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ', 0.20)';
    }

    const history = (clientData.exerciseHistory && clientData.exerciseHistory[exName]) ? clientData.exerciseHistory[exName] : [];
    const ctx = document.getElementById('exerciseChart');
    if (!ctx) return;
    
    if(window.exerciseChartInstance) {
        window.exerciseChartInstance.destroy();
    }
    
    if(history.length === 0) {
        ctx.parentElement.innerHTML = `
            <div class="h-full flex flex-col justify-center items-center text-[10px] font-bold uppercase tracking-widest text-center" style="color: ${exactPlanColor}; opacity: 0.7;">
                <i class="fa-solid fa-dumbbell text-2xl mb-2"></i>
                Registra peso para ver tu progreso
            </div>`;
        return;
    }

    const recent = history.slice(-8); 
    const labels = recent.map(e => e.date ? e.date.substring(0, 5) : ''); 
    const data = recent.map(e => e.weight);
    
    window.exerciseChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Carga Máx (kg)', 
                data: data, 
                borderColor: exactPlanColor, 
                backgroundColor: bgColorWithAlpha, 
                fill: true, 
                tension: 0.4, 
                borderWidth: 3, 
                pointBackgroundColor: exactPlanColor, 
                pointBorderColor: '#000000', // Borde negro en los puntos para que resalten perfecto con el blanco platinado
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#9ca3af', font: {size: 9} }, grid: { display: false } },
                y: { ticks: { color: '#9ca3af', font: {size: 9} }, grid: { color: '#27272a' }, beginAtZero: false }
            }
        }
    });
};
// ==========================================
// EDITOR DE RUTINAS Y BUSCADOR VISUAL DE EJERCICIOS
// ==========================================
const musculos = ["ABDOMEN", "ADUCTORES", "ANTEBRAZO", "BICEPS", "CARDIO", "CUADRICEPS", "ESPALDA", "GEMELOS", "GLUTEO", "HOMBRO", "ISQUIOS", "PECHO", "TIBIA", "TRICEPS"];
window.addExerciseModal = function(dIdx) {
    const musculoOptions = musculos.map(m => `<option value="${m}">${m}</option>`).join('');

    openModal(`
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-lg font-bold text-yellow-400 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]"><i class="fa-solid fa-plus"></i> Añadir Ejercicio</h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <form onsubmit="saveNewExercise(event, ${dIdx})" class="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            
            <div class="relative bg-[#050505] p-5 rounded-2xl border border-zinc-800 mb-6 shadow-inner">
                <div class="mb-4">
                    <label class="block text-sm font-black text-zinc-400 mb-2 tracking-widest uppercase"><i class="fa-solid fa-layer-group text-cyan-400 mr-1"></i> Grupo Muscular</label>
                    <select id="ex_muscle_filter" onchange="filterExerciseOptions(document.getElementById('ex_search_input').value)" class="w-full bg-[#0a0a0a] border border-cyan-500/50 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white font-bold transition-all outline-none shadow-md appearance-none cursor-pointer">
                        <option value="TODOS">Ver Todos los Músculos</option>
                        ${musculoOptions}
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-black text-zinc-400 mb-2 tracking-widest uppercase"><i class="fa-solid fa-magnifying-glass text-yellow-400 mr-1"></i> Buscar Ejercicio</label>
                    <input type="text" id="ex_search_input" onkeyup="filterExerciseOptions(this.value)" placeholder="Ej: sentadilla, press..." class="w-full bg-[#0a0a0a] border border-zinc-700 focus:border-yellow-400 rounded-xl px-4 py-3 text-base text-white font-bold transition-all outline-none shadow-md" autocomplete="off" />
                </div>
                
                <div id="ex_search_results" class="w-full max-h-60 overflow-y-auto bg-[#0a0a0a] border border-yellow-500/50 shadow-[0_0_20px_rgba(255,215,0,0.15)] rounded-xl mt-3 hidden custom-scrollbar"></div>
            </div>
            
            <input type="hidden" id="n_e_nm" />
            <input type="hidden" id="n_e_im" />
            <input type="hidden" id="n_e_ds" />

            <div id="selected_ex_preview" class="hidden items-center gap-5 bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/30 mb-4 animate-fade-in shadow-[0_0_10px_rgba(255,215,0,0.1)]">
                <div class="w-20 h-20 bg-white rounded-xl flex items-center justify-center p-2 shadow-inner shrink-0">
                    <img id="prev_ex_img" src="" class="w-full h-full object-contain mix-blend-multiply" />
                </div>
                <div class="flex-1">
                    <p class="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mb-1">Selección:</p>
                    <p id="prev_ex_name" class="text-white font-black text-lg drop-shadow-md leading-tight"></p>
                </div>
            </div>

        <div class="grid grid-cols-2 gap-3">
            <!-- AQUI CAMBIAMOS EL INPUT POR EL SELECT DESPLEGABLE -->
        <div>
                <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Series</label>
                <select id="n_e_st" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium cursor-pointer appearance-none">
                    <option value="1 Serie">1 Serie</option>
                    <option value="2 Series">2 Series</option>
                    <option value="3 Series">3 Series</option>
                    <option value="4 Series" selected>4 Series</option>
                    <option value="5 Series">5 Series</option>
                    <option value="6 Series">6 Series</option>
                </select>
            </div>
    
            <!-- LAS REPETICIONES QUEDAN EXACTAMENTE IGUAL -->
            <div>
                <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Repeticiones</label>
                <input type="text" id="n_e_rp" value="10-12 Reps" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" />
            </div>
        </div>
            <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Tiempo de Descanso</label><input type="text" id="n_e_rt" value="4-5 Minutos" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" /></div>
            
            <button type="submit" class="w-full btn-depth bg-yellow-400 text-black font-extrabold py-4 rounded-xl text-sm mt-4 shadow-[0_0_15px_rgba(255,215,0,0.4)]"><i class="fa-solid fa-plus"></i> Añadir a la Rutina</button>
        </form>
    `);
    
    filterExerciseOptions(""); // Inicia mostrando u ocultando según el select
};

window.filterExerciseOptions = function(query) {
    const resultsDiv = document.getElementById('ex_search_results');
    const selectedMuscle = document.getElementById('ex_muscle_filter').value;
    
    if(!query && selectedMuscle === "TODOS") { 
        resultsDiv.classList.add('hidden'); 
        return; 
    }
    
    let matches = Object.keys(exerciseDetails);

    if (selectedMuscle !== "TODOS") {
        matches = matches.filter(name => {
            const exImg = exerciseDetails[name].img.toUpperCase();
            return exImg.includes(`/${selectedMuscle}/`);
        });
    }

    if (query) {
        matches = matches.filter(name => name.toLowerCase().includes(query.toLowerCase()));
    }
    
    if(matches.length > 0) {
        resultsDiv.innerHTML = matches.map(name => {
            const ex = exerciseDetails[name];
            return `
            <div onclick="selectExerciseOption('${name}', '${ex.img}', '${ex.desc.replace(/'/g, "\\'")}')" class="p-3 hover:bg-zinc-800 cursor-pointer flex items-center gap-4 border-b border-zinc-800 last:border-0 transition-colors group">
                <div class="w-14 h-14 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img src="${ex.img}" class="w-full h-full object-contain mix-blend-multiply" onerror="gymImgFix(this)" />
                </div>
                <span class="text-sm font-bold text-white drop-shadow-md">${name}</span>
            </div>`;
        }).join('');
        resultsDiv.classList.remove('hidden');
    } else {
        resultsDiv.innerHTML = `<div class="p-4 text-sm text-zinc-500 font-medium text-center">No se encontraron ejercicios en este grupo.</div>`;
        resultsDiv.classList.remove('hidden');
    }
};

window.selectExerciseOption = function(name, img, desc) {
    document.getElementById('n_e_nm').value = name;
    document.getElementById('n_e_im').value = img;
    document.getElementById('n_e_ds').value = desc;
    
    document.getElementById('ex_search_input').value = name;
    document.getElementById('ex_search_results').classList.add('hidden');
    
    document.getElementById('prev_ex_img').src = img;
    document.getElementById('prev_ex_name').innerText = name;
    document.getElementById('selected_ex_preview').classList.remove('hidden');
    document.getElementById('selected_ex_preview').classList.add('flex');
};

window.saveNewExercise = function(e, dIdx) {
    e.preventDefault();
    let nm = document.getElementById('n_e_nm').value;
    let img = document.getElementById('n_e_im').value;
    let desc = document.getElementById('n_e_ds').value;

    if(!nm) {
        nm = document.getElementById('ex_search_input').value;
        img = "ejercicios/default.png";
        desc = "Sigue las indicaciones de tu entrenador.";
    }

    state.selectedClientRecord.workout[dIdx].exercises.push({ 
        name: nm, 
        img: img, 
        sets: document.getElementById('n_e_st').value, 
        reps: document.getElementById('n_e_rp').value, 
        rest: document.getElementById('n_e_rt').value, 
        desc: desc 
    });
    syncClientToDB(state.selectedClientRecord); closeModal(); renderMainContent();
};

window.editExerciseModal = function(dIdx, exIdx) {
    const clientData = state.selectedClientRecord;
    const ex = clientData.workout[dIdx].exercises[exIdx];
    const musculoOptions = musculos.map(m => `<option value="${m}">${m}</option>`).join('');

    openModal(`
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-lg font-bold text-yellow-400 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]"><i class="fa-solid fa-pen"></i> Editar Ejercicio</h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        
        <div class="relative bg-[#050505] p-5 rounded-2xl border border-zinc-800 mb-6 shadow-inner">
            <div class="mb-4">
                <label class="block text-sm font-black text-zinc-400 mb-2 tracking-widest uppercase"><i class="fa-solid fa-layer-group text-cyan-400 mr-1"></i> Grupo Muscular</label>
                <select id="edit_ex_muscle_filter" onchange="filterEditExerciseOptions(document.getElementById('edit_ex_search_input').value)" class="w-full bg-[#0a0a0a] border border-cyan-500/50 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white font-bold transition-all outline-none shadow-md appearance-none cursor-pointer">
                    <option value="TODOS">Ver Todos los Músculos</option>
                    ${musculoOptions}
                </select>
            </div>

            <div>
                <label class="block text-sm font-black text-zinc-400 mb-2 tracking-widest uppercase"><i class="fa-solid fa-magnifying-glass text-yellow-400 mr-1"></i> Buscar Ejercicio (Reemplazar)</label>
                <input type="text" id="edit_ex_search_input" onkeyup="filterEditExerciseOptions(this.value)" placeholder="Ej: sentadilla, press..." class="w-full bg-[#0a0a0a] border border-zinc-700 focus:border-yellow-400 rounded-xl px-4 py-3 text-sm text-white font-bold transition-all outline-none shadow-md" autocomplete="off" />
            </div>
            <div id="edit_ex_search_results" class="w-full max-h-60 overflow-y-auto bg-[#0a0a0a] border border-yellow-500/50 shadow-[0_0_20px_rgba(255,215,0,0.15)] rounded-xl mt-3 hidden custom-scrollbar"></div>
        </div>

        <form onsubmit="saveExerciseEdit(event, ${dIdx}, ${exIdx})" class="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Nombre Ejercicio</label><input type="text" id="e_nm" value="${ex.name}" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" /></div>
            <input type="hidden" id="e_im" value="${ex.img}" />
            <div class="grid grid-cols-2 gap-3">
                <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Series</label><input type="text" id="e_st" value="${ex.sets}" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" /></div>
                <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Repeticiones</label><input type="text" id="e_rp" value="${ex.reps}" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" /></div>
            </div>
            <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Tiempo de Descanso</label><input type="text" id="e_rt" value="${ex.rest || '4-5 Minutos'}" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" /></div>
            <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Explicación</label><textarea id="e_ds" required rows="3" class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium">${ex.desc || ''}</textarea></div>
            <div class="flex gap-3 pt-4 border-t border-zinc-800">
                <button type="button" onclick="deleteExercise(${dIdx}, ${exIdx})" class="flex-1 bg-red-900/40 text-red-400 border border-red-500/50 py-3.5 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition"><i class="fa-solid fa-trash"></i> Eliminar</button>
                <button type="submit" class="flex-1 btn-depth bg-yellow-400 text-black font-extrabold py-3.5 rounded-xl text-sm shadow-[0_0_15px_rgba(255,215,0,0.4)]"><i class="fa-solid fa-save"></i> Guardar</button>
            </div>
        </form>
    `);
};

window.filterEditExerciseOptions = function(query) {
    const resultsDiv = document.getElementById('edit_ex_search_results');
    const selectedMuscle = document.getElementById('edit_ex_muscle_filter').value;
    
    if(!query && selectedMuscle === "TODOS") { 
        resultsDiv.classList.add('hidden'); 
        return; 
    }
    
    let matches = Object.keys(exerciseDetails);

    if (selectedMuscle !== "TODOS") {
        matches = matches.filter(name => {
            const exImg = exerciseDetails[name].img.toUpperCase();
            return exImg.includes(`/${selectedMuscle}/`);
        });
    }

    if (query) {
        matches = matches.filter(name => name.toLowerCase().includes(query.toLowerCase()));
    }
    
    if(matches.length > 0) {
        resultsDiv.innerHTML = matches.map(name => {
            const ex = exerciseDetails[name];
            return `
            <div onclick="selectEditExerciseOption('${name}', '${ex.img}', '${ex.desc.replace(/'/g, "\\'")}')" class="p-3 hover:bg-zinc-800 cursor-pointer flex items-center gap-4 border-b border-zinc-800 last:border-0 transition-colors group">
                <div class="w-14 h-14 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <img src="${ex.img}" class="w-full h-full object-contain mix-blend-multiply" onerror="gymImgFix(this)" />
                </div>
                <span class="text-sm font-bold text-white drop-shadow-md">${name}</span>
            </div>`;
        }).join('');
        resultsDiv.classList.remove('hidden');
    } else {
        resultsDiv.innerHTML = `<div class="p-4 text-sm text-zinc-500 font-medium text-center">No se encontraron ejercicios en este grupo.</div>`;
        resultsDiv.classList.remove('hidden');
    }
};

window.selectEditExerciseOption = function(name, img, desc) {
    document.getElementById('e_nm').value = name;
    document.getElementById('e_im').value = img;
    document.getElementById('e_ds').value = desc;
    
    document.getElementById('edit_ex_search_input').value = name;
    document.getElementById('edit_ex_search_results').classList.add('hidden');
};

window.saveExerciseEdit = function(e, dIdx, exIdx) {
    e.preventDefault(); 
    const clientData = state.selectedClientRecord;
    
    // Aquí tomamos todos los valores del formulario de edición, incluyendo la explicación (desc)
    clientData.workout[dIdx].exercises[exIdx] = { 
        name: document.getElementById('e_nm').value, 
        img: document.getElementById('e_im').value, 
        sets: document.getElementById('e_st').value, 
        reps: document.getElementById('e_rp').value, 
        rest: document.getElementById('e_rt').value, 
        desc: document.getElementById('e_ds').value 
    };
    
    // Guardamos en la base de datos y recargamos
    syncClientToDB(clientData); 
    closeModal(); 
    renderMainContent();
};

window.deleteExercise = function(dIdx, exIdx) {
    if(confirm("¿Seguro que deseas eliminar este ejercicio?")) {
        state.selectedClientRecord.workout[dIdx].exercises.splice(exIdx, 1);
        syncClientToDB(state.selectedClientRecord); closeModal(); renderMainContent();
    }
};

// ==========================================
// PORTAL DE USUARIO Y RUTINA
// ==========================================
window.switchClientTab = function(tab) { state.clientTab = tab; renderMainContent(); };

window.uploadProfilePic = function(event, cc) { 
    const file = event.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = function(e) { const client = state.clients.find(c => c.cc === cc); if(client) { client.profilePic = e.target.result; syncClientToDB(client); if(state.currentUser && state.currentUser.cc === cc) { state.currentUser.record.profilePic = e.target.result; localStorage.setItem('gym_session', JSON.stringify(state.currentUser)); } renderMainContent(); } }; reader.readAsDataURL(file); }
}

// NUEVO: Modal para Registrar Nuevos Datos BIA (Punto 1 y 2)
window.showNewBiaModal = function() {
    const dToday = new Date().toISOString().split('T')[0];
    openModal(`
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-lg font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]"><i class="fa-solid fa-weight-scale"></i> Registrar Evaluación BIA</h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <form onsubmit="handleNewBiaSubmit(event)" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Fecha de Registro</label>
                <input type="date" id="n_bia_date" value="${dToday}" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" />
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Peso (kg)</label>
                    <input type="number" step="0.1" id="n_bia_weight" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" />
                </div>
                <div>
                    <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">% Grasa</label>
                    <input type="number" step="0.1" id="n_bia_fat" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" />
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Músculo (kg)</label>
                    <input type="number" step="0.1" id="n_bia_muscle" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" />
                </div>
            </div>
            <button type="submit" class="w-full btn-depth bg-cyan-500 text-black font-extrabold py-4 rounded-xl text-sm mt-4 shadow-[0_0_15px_rgba(0,229,255,0.4)]"><i class="fa-solid fa-save"></i> Guardar Datos</button>
        </form>
    `);
};

window.handleNewBiaSubmit = function(e) {
    e.preventDefault();
    const clientData = state.viewingClientAsAdmin ? state.selectedClientRecord : (state.clients.find(c => c.cc === state.currentUser.cc) || state.currentUser.record);
    
    const rawDate = document.getElementById('n_bia_date').value;
    const dateObj = new Date(rawDate);
    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
    const evalDate = dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    const weight = Number(document.getElementById('n_bia_weight').value);
    const fat = Number(document.getElementById('n_bia_fat').value);
    const muscle = Number(document.getElementById('n_bia_muscle').value);
    const height = clientData.bia.height;
    const bmi = (weight / ((height/100) ** 2)).toFixed(1);

    clientData.bia.weight = weight;
    clientData.bia.fat = fat;
    clientData.bia.muscle = muscle;
    clientData.bia.bmi = bmi;

    if(!clientData.evaluations) clientData.evaluations = [];
    clientData.evaluations.push({ date: evalDate, weight, fat, muscle, bmi });
    
    syncClientToDB(clientData);
    closeModal();
    renderMainContent();
};

function renderClientPortal() {
  const clientData = state.viewingClientAsAdmin ? state.selectedClientRecord : (state.clients.find(c => c.cc === state.currentUser.cc) || state.currentUser.record);
  if (!clientData) return `<p class="p-8 text-zinc-400 text-center font-bold">Sin registros.</p>`;

  const { bia, workout, name, date, days, dueDate, profilePic, plan } = clientData;
  // Los planes guardados conservan rutas de imagen antiguas: se actualizan con las del diccionario actual
  refreshWorkoutImages(workout);
  const daysLeft = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft < 0;
  
  const defaultPlan = gymPlans[0];
  const userPlan = plan || defaultPlan;
  const effColor = userPlan.color === '#18181B' ? '#D4D4D8' : userPlan.color; 
  
  const planIndex = gymPlans.findIndex(p => p.id === userPlan.id);
  const planIdxParam = planIndex !== -1 ? planIndex : 0;

  const themeStyles = `
    <style>
      .u-theme-text { color: ${effColor} !important; }
      .u-theme-bg { background-color: ${effColor} !important; color: ${effColor === '#E5E7EB' || effColor === '#FFD700' || effColor === '#D4D4D8' ? '#000000' : '#ffffff'} !important; }
      .u-theme-border { border-color: ${effColor} !important; }
      .u-theme-border-soft { border-color: ${effColor}50 !important; }
      .u-theme-shadow { box-shadow: 0 0 15px ${effColor}66 !important; }
      .u-theme-drop { filter: drop-shadow(0 0 5px ${effColor}80) !important; }
      .u-theme-btn { background-color: ${effColor}; color: ${effColor === '#E5E7EB' || effColor === '#FFD700' || effColor === '#D4D4D8' ? '#000000' : '#ffffff'}; font-weight: 900; box-shadow: 0 0 15px ${effColor}66; }
      .u-theme-btn:hover { filter: brightness(1.1); transform: scale(1.02); }
    </style>
  `;

  const fallbackBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const profileImageHTML = profilePic ? `<img src="${profilePic}" class="w-full h-full object-cover rounded-full" />` : `<i class="fa-solid fa-camera text-2xl text-zinc-500/50 u-theme-text"></i>`;

  // Calcular días desde migración para el temporizador de 30 días
  const daysSinceMigration = clientData.migratedAt ? Math.floor((new Date() - new Date(clientData.migratedAt)) / (1000 * 60 * 60 * 24)) : 0;
  const showComparison = clientData.isMigrated && daysSinceMigration <= 30;

  let contentHTML = state.clientTab === 'calendar' ? renderCalendarHTML('client') : `
      <div class="card-depth p-6 md:p-10 rounded-[2rem] flex flex-col gap-6 mb-8 border u-theme-border-soft shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative z-10 bg-[#050505] overflow-hidden">
        
        <!-- Fila superior: Foto, Nombre, Lápiz y Botón PDF -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div class="flex items-center gap-6">
              <!-- Foto -->
              <div class="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-dashed u-theme-border inner-depth flex items-center justify-center overflow-hidden cursor-pointer transition u-theme-shadow group shrink-0" onclick="document.getElementById('pic-upload').click()">
                  ${profileImageHTML}
                  <div class="absolute inset-0 bg-black/60 hidden group-hover:flex flex-col items-center justify-center text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-sm"><i class="fa-solid fa-camera mb-1"></i> Foto</div><input type="file" id="pic-upload" class="hidden" accept="image/*" onchange="uploadProfilePic(event, '${clientData.cc}')" />
              </div>
              
              <!-- Info y Lápiz -->
              <div>
                  <div class="flex items-center gap-3">
                      <h2 class="text-2xl md:text-3xl font-black text-white drop-shadow-md uppercase tracking-wider">${name}</h2>
                      
                      ${state.viewingClientAsAdmin ? `
                      <!-- BOTÓN LÁPIZ PARA EDITAR (SÓLO VISIBLE PARA ENTRENADOR) -->
                      <button onclick="openEditProfileModal()" class="w-8 h-8 md:w-9 md:h-9 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 hover:border-cyan-500 transition-all shadow-md z-20" title="Editar Perfil">
                          <i class="fa-solid fa-pen text-[10px] md:text-xs"></i>
                      </button>
                      ` : ''}
                      
                  </div>
                  <p class="text-[10px] md:text-xs mt-1 font-bold uppercase tracking-widest text-zinc-500">
                      CC: ${clientData.cc} <span class="mx-1 text-zinc-700">|</span> Registro: ${date}
                  </p>
              </div>
          </div>
          
          <button onclick="downloadPDF()" class="btn-depth px-5 py-3 md:px-6 md:py-4 rounded-2xl text-xs md:text-sm w-full md:w-auto flex justify-center items-center gap-2 u-theme-btn transition shadow-lg shrink-0"><i class="fa-solid fa-file-pdf"></i> Guardar PDF</button>
        </div>
        
        <div class="w-full h-px bg-zinc-800/80 my-2"></div>

        <!-- LAS 4 MÉTRICAS BIA PRINCIPALES -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-20">
            <!-- Peso -->
            <div class="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-inner">
                <div class="w-2.5 h-10 rounded-full bg-[#eab308]"></div>
                <div>
                    <p class="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Peso (kg)</p>
                    <p class="text-lg font-black text-white drop-shadow-sm">${bia.weight || '0'}</p>
                </div>
            </div>
            <!-- Grasa -->
            <div class="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-inner">
                <div class="w-2.5 h-10 rounded-full bg-[#ef4444]"></div>
                <div>
                    <p class="text-[10px] text-zinc-500 font-black uppercase tracking-widest">% Grasa</p>
                    <p class="text-lg font-black text-white drop-shadow-sm">${bia.fat || '0'}</p>
                </div>
            </div>
            <!-- Músculo -->
            <div class="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-inner">
                <div class="w-2.5 h-10 rounded-full bg-[#10b981]"></div>
                <div>
                    <p class="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Músculo</p>
                    <p class="text-lg font-black text-white drop-shadow-sm">${bia.muscle || '0'}</p>
                </div>
            </div>
            <!-- IMC -->
            <div class="bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-inner">
                <div class="w-2.5 h-10 rounded-full bg-[#3b82f6]"></div>
                <div>
                    <p class="text-[10px] text-zinc-500 font-black uppercase tracking-widest">IMC</p>
                    <p class="text-lg font-black text-white drop-shadow-sm">${bia.bmi || '0'}</p>
                </div>
            </div>
        </div>
      </div>

      <!-- INSIGNIA FUNDADOR -->
      ${clientData.isMigrated ? `<div class="mb-4 inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/50 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(255,215,0,0.2)]"><i class="fa-solid fa-medal text-yellow-400 text-lg drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]"></i><span class="text-xs font-black text-yellow-400 uppercase tracking-widest">Miembro Pionero</span></div>` : ''}

      ${showComparison ? `
      <!-- COMPARATIVA DE PLANES (Temporal 30 Días) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative z-10">
          <div class="card-depth p-5 rounded-[2rem] border border-zinc-800 bg-[#050505] opacity-70 grayscale relative flex flex-col justify-center">
              <p class="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Tu Plan Anterior</p>
              <h3 class="text-lg font-black text-zinc-400 uppercase line-through">${clientData.oldPlanName}</h3>
              <p class="text-xs text-zinc-600 mt-2 font-medium">Plan antiguo fuera de servicio.</p>
          </div>
          <div class="card-depth p-5 rounded-[2rem] border u-theme-border-soft bg-[#0a0a0a] shadow-[0_0_20px_rgba(0,0,0,0.4)] flex flex-col justify-center relative">
              <div class="flex items-center justify-between mb-1">
                  <p class="text-[10px] text-yellow-400 font-bold uppercase tracking-widest drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]">Tu Evolución (Actual)</p>
                  <i class="fa-solid fa-arrow-up-right-dots text-yellow-400"></i>
              </div>
              <h3 class="text-xl font-black text-white uppercase tracking-widest u-theme-drop mb-3">${userPlan.id}</h3>
              
              <div class="flex gap-2 mt-auto">
                  <button onclick="showDynamicPlanModal(${planIdxParam})" class="flex-1 text-[10px] md:text-xs bg-zinc-800 text-zinc-300 py-2.5 rounded-xl hover:bg-zinc-700 transition font-bold shadow-md">Ver Beneficios</button>
                  ${state.viewingClientAsAdmin ? `<button onclick="showChangePlanModal('${clientData.cc}')" class="flex-1 text-[10px] md:text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 py-2.5 rounded-xl hover:bg-yellow-500 hover:text-black transition font-bold shadow-[0_0_10px_rgba(255,215,0,0.2)]"><i class="fa-solid fa-pen"></i> Cambiar Plan</button>` : ''}
              </div>
          </div>
      </div>
      ` : `
      <!-- VISTA NORMAL (Nuevos o Pioneros después de 30 días) -->
      <div class="card-depth p-6 rounded-[2rem] border u-theme-border-soft mb-8 bg-[#0a0a0a] shadow-[0_0_15px_rgba(0,0,0,0.4)] relative group overflow-hidden z-10">
          <div class="absolute right-6 top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-chevron-right text-3xl u-theme-text"></i></div>
          <div class="flex items-center gap-3 mb-2"><i class="fa-solid fa-id-badge text-2xl u-theme-text u-theme-drop"></i><h3 class="text-lg md:text-xl font-black text-white uppercase tracking-widest">${userPlan.id}</h3></div>
          <p class="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-2">${userPlan.subtitle}</p>
          <p class="text-sm text-zinc-300 font-medium leading-relaxed pr-12 mb-5">${userPlan.target}</p>
          
          <div class="flex gap-3 relative z-20">
              <button onclick="showDynamicPlanModal(${planIdxParam})" class="text-xs bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition font-bold shadow-md">Ver Beneficios del Plan</button>
              ${state.viewingClientAsAdmin ? `<button onclick="showChangePlanModal('${clientData.cc}')" class="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-4 py-2.5 rounded-xl hover:bg-cyan-500 hover:text-black transition font-bold shadow-[0_0_10px_rgba(0,229,255,0.2)]"><i class="fa-solid fa-pen"></i> Cambiar Plan</button>` : ''}
          </div>
      </div>
      `}

      <div class="p-6 md:p-8 mb-8 rounded-[2rem] border ${isExpired ? 'bg-red-900/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'card-depth border-yellow-500/40 shadow-[0_0_20px_rgba(255,215,0,0.1)]'} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div class="flex items-center gap-5">
              <div class="w-14 h-14 rounded-2xl inner-depth flex items-center justify-center ${isExpired ? 'text-red-500 border border-red-500/50 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-yellow-400 border border-yellow-500/50 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]'}"><i class="fa-solid fa-calendar-check text-2xl"></i></div>
              <div><p class="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Estado Mensualidad</p><p class="text-xl font-bold text-white drop-shadow-md">Vence: <span class="${isExpired ? 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'text-yellow-400 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]'}">${dueDate}</span></p></div>
          </div>
          <span class="px-6 py-3 rounded-xl text-xs font-black uppercase w-full md:w-auto text-center tracking-widest shadow-md ${isExpired ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'btn-depth bg-yellow-400 text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]'}">${isExpired ? 'VENCIDA' : daysLeft + ' Días Restantes'}</span>
      </div>
      
      <!-- SECCIÓN GRÁFICA -->
      <div class="card-depth rounded-[2rem] overflow-hidden mb-8 border border-zinc-800/80 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative z-10">
          <div class="bg-[#050505] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-black">
              <div class="flex items-center gap-4 cursor-pointer hover:opacity-80 transition" onclick="toggleProgressChart()">
                  <h3 class="text-sm font-bold flex items-center gap-3 u-theme-text u-theme-drop"><i class="fa-solid fa-chart-line text-lg"></i> Evolución Física</h3>
                  <button class="inner-depth text-zinc-400 px-4 py-2 rounded-lg text-xs font-bold border border-zinc-800"><span id="chart-toggle-text">Ocultar</span> <i id="chart-toggle-icon" class="fa-solid fa-chevron-up ml-1"></i></button>
              </div>
              <button onclick="event.stopPropagation(); showNewBiaModal()" class="btn-depth w-full md:w-auto bg-cyan-500 text-black px-5 py-2.5 rounded-xl text-xs font-bold shadow-[0_0_10px_rgba(0,229,255,0.3)] hover:scale-105 transition"><i class="fa-solid fa-plus"></i> Registrar Nuevos Datos</button>
          </div>
          <div id="chart-wrapper" class="p-6 md:p-8 bg-[#030303]"><div class="relative h-64 w-full"><canvas id="progressChart"></canvas></div></div>
      </div>

      <!-- SECCIÓN RUTINA -->
      <div id="pdf-container" class="space-y-6 relative z-10">
          <div class="card-depth p-6 md:p-10 rounded-[2rem] border u-theme-border-soft shadow-[0_0_20px_rgba(0,0,0,0.05)]">
              <div class="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8 border-b border-zinc-800/80 pb-6 justify-between">
                  <div class="flex items-center gap-4">
                      <div class="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border u-theme-border u-theme-text u-theme-shadow"><i class="fa-solid fa-dumbbell text-xl"></i></div>
                      <h3 class="text-xl md:text-2xl font-black text-white drop-shadow-md">Plan de Entrenamiento <span class="text-zinc-500 text-lg font-medium">(${days || 4} Días)</span></h3>
                  </div>
                  ${state.viewingClientAsAdmin ? `
                  <button onclick="showRoutineGeneratorModal()" class="btn-depth w-full md:w-auto bg-yellow-400 text-black font-extrabold px-6 py-3.5 rounded-xl text-sm shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:scale-105 transition flex items-center justify-center gap-2 gen-btn-pdf-hide">
                      <i class="fa-solid fa-wand-magic-sparkles"></i> Generar Nueva Rutina
                  </button>
                  ` : ''}
              </div>
              
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  ${workout.map((d, dIdx) => `
                  <div class="inner-depth p-6 rounded-2xl space-y-5 border border-zinc-800/50 relative">
                      <h4 class="font-bold text-sm border-b border-zinc-800/80 pb-3 u-theme-text u-theme-drop">${d.day}</h4>
                      <div class="space-y-4">
                          ${d.exercises.map((ex, exIdx) => `
                          <div onclick="openExerciseModal(${dIdx}, ${exIdx})" class="cursor-pointer bg-[#050505] p-4 rounded-xl flex gap-4 border border-zinc-800/80 hover:border-zinc-500 transition group items-center relative overflow-hidden">
                              <div class="w-28 h-20 rounded-lg bg-white flex items-center justify-center border u-theme-border-soft shrink-0 overflow-hidden shadow-inner p-1">
                                  <img src="${ex.img}" alt="${ex.name}" class="w-full h-full object-contain mix-blend-multiply" onerror="gymImgFix(this)"/>
                              </div>
                              <div class="flex-1 flex flex-col justify-center gap-2">
                                  <div class="text-xs font-bold text-white uppercase drop-shadow-md transition">${exIdx + 1}. ${ex.name}</div>
                                  <div class="flex gap-2 text-[10px] font-black uppercase tracking-wider">
                                      <span class="bg-[#0a0a0a] px-3 py-1.5 rounded border u-theme-border-soft u-theme-text">${ex.sets}</span>
                                      <span class="bg-[#0a0a0a] px-3 py-1.5 rounded border border-zinc-700 text-zinc-300">${ex.reps}</span>
                                  </div>
                              </div>
                              ${state.viewingClientAsAdmin ? `
                                  <button onclick="event.stopPropagation(); editExerciseModal(${dIdx}, ${exIdx})" class="absolute top-2 right-2 w-8 h-8 rounded bg-[#0a0a0a] border border-zinc-700 text-zinc-500 hover:text-yellow-400 hover:border-yellow-400 transition flex items-center justify-center shadow-md edit-btn-pdf-hide">
                                      <i class="fa-solid fa-pen"></i>
                                  </button>
                              ` : ''}
                          </div>
                          `).join('')}
                      </div>
                      ${state.viewingClientAsAdmin ? `
                          <button onclick="addExerciseModal(${dIdx})" class="w-full mt-4 border border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:border-white py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 add-btn-pdf-hide">
                              <i class="fa-solid fa-plus"></i> Añadir Ejercicio
                          </button>
                      ` : ''}
                  </div>`).join('')}
              </div>
          </div>
      </div>
  `;

  return `
    ${themeStyles}
    <!-- MARCA DE AGUA -->
    <div class="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-0 overflow-hidden opacity-[0.03]">
        <h1 class="text-[18vw] font-black text-white leading-none tracking-tighter select-none">GYM</h1>
        <h1 class="text-[18vw] font-black text-white leading-none tracking-tighter select-none">FINITY</h1>
    </div>
    
    <div class="space-y-6 animate-fade-in pb-12 relative z-10">
      ${state.currentUser && state.currentUser.role === 'admin' ? `<div class="flex justify-between items-center bg-yellow-500/10 border border-yellow-500/40 p-4 rounded-2xl mb-6 shadow-[0_0_15px_rgba(255,215,0,0.1)]"><button onclick="backToAdminPanel()" class="bg-[#050505] text-yellow-400 border border-yellow-500/50 hover:bg-yellow-400 hover:text-black hover:shadow-[0_0_15px_rgba(255,215,0,0.4)] px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2"><i class="fa-solid fa-arrow-left"></i> Volver al Panel Admin</button></div>` : ''}
      <div class="flex flex-wrap gap-3 border-b border-zinc-900 pb-6 mb-6">
          <button onclick="switchClientTab('routine')" class="px-6 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${state.clientTab === 'routine' ? 'u-theme-btn' : 'bg-[#0a0a0a] text-zinc-400 hover:text-white border border-zinc-800'}"><i class="fa-solid fa-dumbbell"></i> Mi Plan</button>
          <button onclick="switchClientTab('calendar')" class="px-6 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${state.clientTab === 'calendar' ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]' : 'bg-[#0a0a0a] text-zinc-400 hover:text-white border border-zinc-800'}"><i class="fa-solid fa-calendar-day"></i> Citas / Asistencia</button>
      </div>
      ${contentHTML}
    </div>
  `;
}

// ==========================================
// LANDING PAGE Y PLANES 
// ==========================================
function renderLandingPage() {
  const currentProduct = storeProducts[state.currentProductIndex];
  
  const mainPlans = gymPlans.slice(0, 3);
  const extraPlans = gymPlans.slice(3);

  return `
    <div class="flex flex-col gap-24 animate-fade-in pb-20">
      <div class="text-center mt-12 md:mt-16 space-y-6">
          <h2 class="text-5xl md:text-7xl font-black tracking-tight leading-tight flex flex-col md:flex-row items-center justify-center gap-3 md:gap-5">
              <div class="flex"><span class="letter-anim delay-1">G</span><span class="letter-anim delay-2">Y</span><span class="letter-anim delay-3">M</span><span class="letter-anim delay-4 ml-2">F</span><span class="letter-anim delay-5">I</span><span class="letter-anim delay-6">N</span><span class="letter-anim delay-7">I</span><span class="letter-anim delay-8">T</span><span class="letter-anim delay-9">Y</span><span class="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]">,</span></div>
              <span class="glow-text-anim text-white">entrena sin limites.</span>
          </h2>
          <p class="text-zinc-400 max-w-2xl mx-auto text-sm md:text-base mt-2 drop-shadow-md">Ciencia, tecnología y entrenamiento personalizado. Evaluación InBody, análisis biomecánico y rutinas diseñadas a tu medida para maximizar tu rendimiento y alcanzar tus objetivos.</p>
      </div>
      
      <div class="space-y-12">
          <h3 class="text-center text-xl md:text-2xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Estructura de Planes</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
              ${mainPlans.map((plan, index) => {
                  const isBlack = plan.id.includes('RUTINA');
                  const planColor = isBlack ? '#3F3F46' : plan.color; 
                  const planShadow = isBlack ? 'rgba(255,255,255,0.2)' : plan.shadow;
                  const bgColorAlpha = isBlack ? 'rgba(63, 63, 70, 0.4)' : `${plan.color}1A`;
                  const textColor = isBlack ? '#FFFFFF' : plan.color;

                  return `
                  <div onclick="showDynamicPlanModal(${index})" class="rounded-3xl p-8 cursor-pointer flex flex-col items-center relative transparent-plan-card group" style="--plan-color: ${planColor}; --plan-shadow: ${planShadow}; --plan-shadow-inset: ${planColor}33; --plan-color-alpha: ${bgColorAlpha};">
                      <h4 class="text-xl font-black uppercase text-center group-hover:scale-110 transition-transform duration-300 drop-shadow-md" style="color: ${textColor};">${plan.id}</h4>
                      <p class="text-xs text-zinc-400 uppercase tracking-widest mb-4 text-center font-bold group-hover:text-zinc-300 transition-colors">${plan.subtitle}</p>
                      <p class="text-3xl font-black text-white mb-8 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">${plan.price}</p>
                      <ul class="w-full space-y-4 text-sm text-zinc-400 mb-8 flex-1 group-hover:text-zinc-200 transition-colors font-medium">
                          <li class="flex items-center gap-3"><i class="fa-regular fa-clock text-zinc-500 group-hover:text-zinc-300"></i> ${plan.schedule}</li>
                          ${plan.classes ? `<li class="flex items-center gap-3"><i class="fa-solid fa-check text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]"></i> Clases grupales</li>` : `<li class="flex items-center gap-3"><i class="fa-solid fa-xmark text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"></i> Sin Clases grupales</li>`}
                          ${plan.inbody ? `<li class="flex items-center gap-3"><i class="fa-solid fa-check text-cyan-500 drop-shadow-[0_0_5px_rgba(0,229,255,0.8)]"></i> ${plan.inbody}</li>` : `<li class="flex items-center gap-3"><i class="fa-solid fa-xmark text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"></i> Sin InBody</li>`}
                      </ul>
                      <div class="mt-auto w-full text-center border-t border-zinc-800/50 pt-5 transition-colors group-hover:border-zinc-500"><p class="text-xs font-black transition-all group-hover:translate-x-2 inline-block drop-shadow-md" style="color: ${textColor};">Ver detalles <i class="fa-solid fa-arrow-right ml-1"></i></p></div>
                  </div>
              `}).join('')}
          </div>

          <div class="text-center mt-8">
              <button onclick="document.getElementById('extra-plans-container').classList.toggle('hidden')" class="bg-[#0a0a0a] border border-zinc-800 text-zinc-300 px-6 py-3 rounded-xl font-bold hover:text-white transition shadow-md">
                  <i class="fa-solid fa-layer-group text-yellow-400"></i> VER PLANES EXTRA <i class="fa-solid fa-chevron-down ml-2"></i>
              </button>
          </div>

          <div id="extra-plans-container" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch mt-8 transition-all">
              ${extraPlans.map((plan, index) => {
                  const actualIndex = index + 3; 
                  const isBlack = plan.id.includes('RUTINA');
                  const planColor = isBlack ? '#3F3F46' : plan.color; 
                  const planShadow = isBlack ? 'rgba(255,255,255,0.2)' : plan.shadow;
                  const bgColorAlpha = isBlack ? 'rgba(63, 63, 70, 0.4)' : `${plan.color}1A`;
                  const textColor = isBlack ? '#FFFFFF' : plan.color;

                  return `
                  <div onclick="showDynamicPlanModal(${actualIndex})" class="rounded-3xl p-8 cursor-pointer flex flex-col items-center relative transparent-plan-card group" style="--plan-color: ${planColor}; --plan-shadow: ${planShadow}; --plan-shadow-inset: ${planColor}33; --plan-color-alpha: ${bgColorAlpha};">
                      <h4 class="text-xl font-black uppercase text-center group-hover:scale-110 transition-transform duration-300 drop-shadow-md" style="color: ${textColor};">${plan.id}</h4>
                      <p class="text-xs text-zinc-400 uppercase tracking-widest mb-4 text-center font-bold group-hover:text-zinc-300 transition-colors">${plan.subtitle}</p>
                      <p class="text-3xl font-black text-white mb-8 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">${plan.price}</p>
                      <ul class="w-full space-y-4 text-sm text-zinc-400 mb-8 flex-1 group-hover:text-zinc-200 transition-colors font-medium">
                          <li class="flex items-center gap-3"><i class="fa-regular fa-clock text-zinc-500 group-hover:text-zinc-300"></i> ${plan.schedule}</li>
                          ${plan.classes ? `<li class="flex items-center gap-3"><i class="fa-solid fa-check text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]"></i> Clases grupales</li>` : `<li class="flex items-center gap-3"><i class="fa-solid fa-xmark text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"></i> Sin Clases grupales</li>`}
                      </ul>
                      <div class="mt-auto w-full text-center border-t border-zinc-800/50 pt-5 transition-colors group-hover:border-zinc-500"><p class="text-xs font-black transition-all group-hover:translate-x-2 inline-block drop-shadow-md" style="color: ${textColor};">Ver detalles <i class="fa-solid fa-arrow-right ml-1"></i></p></div>
                  </div>
              `}).join('')}
          </div>
      </div>
      
      <div class="space-y-12">
          <h3 class="text-center text-xl md:text-2xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Clases Grupales</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              ${gymCoaches.map(c => `
                  <div class="card-depth border border-zinc-800/80 rounded-[2rem] overflow-hidden flex flex-col md:flex-row group hover:border-cyan-500/50 transition duration-500">
                      <div class="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center space-y-4 order-2 md:order-1 relative z-10 bg-[#050505]/80 backdrop-blur-sm">
                          <div><p class="text-[10px] text-yellow-500 font-black uppercase tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]">${c.coach}</p><h4 class="text-2xl font-black text-white group-hover:text-cyan-400 transition-colors drop-shadow-md">${c.name}</h4></div>
                          <p class="text-sm text-zinc-400 leading-relaxed font-medium">${c.desc}</p>
                      </div>
                      <div class="w-full md:w-1/2 relative min-h-[200px] md:min-h-full order-1 md:order-2 overflow-hidden bg-black flex items-center justify-center"><div class="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#050505] to-transparent z-10 hidden md:block"></div><img src="${c.img}" alt="${c.name}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700 opacity-70 group-hover:opacity-100" onerror="this.src='https://via.placeholder.com/400x400/15130b/fff.png&text=${encodeURIComponent(c.name)}'"/></div>
                  </div>
              `).join('')}
          </div>
      </div>
      
      <div class="space-y-8 pb-10" id="tienda-section">
          <h3 class="text-center text-xl md:text-2xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Tienda Pro</h3>
          
          <!-- Carrusel de Marcas -->
          <div class="relative w-full max-w-4xl mx-auto py-4">
              <div class="flex items-center justify-between gap-4" id="brand-carousel-container">
                  <!-- Esto se llenará con JavaScript (Carrusel 3D) -->
              </div>
              
              <!-- Sub-Filtros (Proteínas, Creatinas, etc) -->
              <div id="product-type-filters" class="flex justify-center flex-wrap gap-3 mt-8">
                  <!-- Se llena con JS -->
              </div>
          </div>

          <!-- Cuadrícula de Productos -->
          <div id="products-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
               <!-- Se llena con JS -->
          </div>
      </div>  
    </div>
  `;
}

// ==========================================
// MODALES GLOBALES Y LOGIN
// ==========================================
function openModal(html) { const m = document.getElementById('app-modal'), c = document.getElementById('modal-content'); c.innerHTML = html; m.classList.remove('hidden'); c.classList.add('animate-scale-up'); }
function closeModal() { document.getElementById('app-modal').classList.add('hidden'); }

window.showDynamicPlanModal = function(index) {
    const plan = gymPlans[index];
    const isBlack = plan.id.includes('RUTINA');
    const planColor = isBlack ? '#3F3F46' : plan.color;

    openModal(`
        <div class="absolute inset-0 metallic-bg rounded-[2rem] overflow-hidden" style="--plan-color: ${planColor};"><div class="metallic-shine"></div><div class="metallic-texture"></div></div>
        <div class="relative z-10 text-left space-y-6">
            <div class="flex justify-between items-start">
                <div class="w-12 h-8 rounded bg-zinc-300 flex flex-col justify-center gap-1 shadow-[0_0_15px_rgba(0,0,0,0.8)] border border-white/50 relative overflow-hidden" style="background: linear-gradient(135deg, #eee, #aaa);"><div class="w-full h-[1px] bg-black/20"></div><div class="w-full h-[1px] bg-black/20"></div><div class="w-full h-[1px] bg-black/20"></div></div>
                <button onclick="closeModal()" class="w-10 h-10 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-black transition border border-white/20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div>
                <h3 class="text-4xl font-black text-white tracking-widest uppercase metal-text-shadow drop-shadow-md">${plan.id}</h3>
                <p class="text-xs font-black uppercase tracking-widest mt-1 metal-text-shadow text-white drop-shadow-md bg-black/40 inline-block px-3 py-1 rounded-full border border-white/10">${plan.subtitle}</p>
                <p class="text-6xl font-black text-white mt-4 metal-text-shadow drop-shadow-md">${plan.price}</p>
            </div>
            <div class="bg-black/70 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.8)] rounded-2xl p-6 space-y-5">
                <div class="text-sm text-zinc-200 italic border-b border-zinc-700/50 pb-4 font-medium"><strong class="text-white not-italic block mb-1">¿Para quién es?</strong> ${plan.target}</div>
                <div class="pt-2"><p class="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-3">Características del Plan</p><ul class="space-y-4 text-sm font-bold text-white drop-shadow-md">
                        <li class="flex items-center gap-4"><i class="fa-regular fa-clock text-zinc-300 text-lg w-5 text-center drop-shadow-md"></i> ${plan.schedule}</li>
                        <li class="flex items-center gap-4"><i class="fa-solid ${plan.classes ? 'fa-check text-green-400' : 'fa-xmark text-red-400'} text-lg w-5 text-center drop-shadow-md"></i> ${plan.classes ? 'Acceso a clases grupales' : 'No incluye clases grupales'}</li>
                        <li class="flex items-center gap-4"><i class="fa-solid ${plan.inbody ? 'fa-check text-cyan-400' : 'fa-xmark text-red-400'} text-lg w-5 text-center drop-shadow-md"></i> ${plan.inbody || 'No incluye InBody'}</li>
                        <li class="flex items-center gap-4"><i class="fa-solid ${plan.routine ? 'fa-check text-cyan-400' : 'fa-xmark text-red-400'} text-lg w-5 text-center drop-shadow-md"></i> ${plan.routine || 'No incluye adaptación de rutina'}</li>
                        ${plan.companion ? `<li class="flex items-center gap-4"><i class="fa-solid fa-user-group text-yellow-400 text-lg w-5 text-center drop-shadow-md"></i> ${plan.companion}</li>` : ''}
                        ${plan.discount ? `<li class="flex items-center gap-4"><i class="fa-solid fa-sparkles text-lg w-5 text-center drop-shadow-md" style="color: ${isBlack ? '#FFFFFF' : plan.color};"></i> ${plan.discount}</li>` : ''}
                </ul></div>
            </div>
        </div>
    `);
};

window.showMainLoginFlow = function() {
  openModal(`
    <div class="flex justify-between items-center mb-8 border-b border-zinc-800/50 pb-4">
        <h3 class="text-xl font-bold text-white flex items-center gap-3 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
            <i class="fa-solid fa-door-open text-cyan-400"></i> Acceso al Sistema
        </h3>
        <button onclick="closeModal()" class="text-zinc-500 hover:text-white">
            <i class="fa-solid fa-xmark text-lg"></i>
        </button>
    </div>
    <div class="space-y-4">
      <button onclick="showClientLoginModal()" class="w-full card-depth border border-cyan-500/30 text-white hover:border-cyan-400 font-bold py-6 rounded-2xl text-sm flex items-center justify-center gap-3 transition-all shadow-[0_0_10px_rgba(0,229,255,0.1)]">
          <i class="fa-solid fa-user text-cyan-400 text-xl"></i> INGRESO DE USUARIO
      </button>
      <button onclick="showAdminLoginModal()" class="w-full card-depth border border-yellow-500/30 text-white hover:border-yellow-400 font-bold py-6 rounded-2xl text-sm flex items-center justify-center gap-3 transition-all shadow-[0_0_10px_rgba(255,215,0,0.1)]">
          <i class="fa-solid fa-user-shield text-yellow-400 text-xl"></i> ACCESO ENTRENADOR
      </button>
    </div>
  `);
};

window.showClientLoginModal = function() {
  openModal(`
    <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
        <h3 class="text-lg font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">Ingreso de Usuario</h3>
        <button onclick="showMainLoginFlow()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-arrow-left"></i></button>
    </div>
    <form onsubmit="handleClientLoginSubmit(event)" class="space-y-5">
      <div>
          <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Cédula</label>
          <input type="text" id="l_c_cc" required class="w-full input-gym rounded-xl p-4 text-sm text-white font-medium" />
      </div>
      <button type="submit" class="w-full btn-depth bg-cyan-500 text-black font-extrabold py-4 rounded-xl text-sm shadow-[0_0_15px_rgba(0,229,255,0.4)]">Entrar a mi Rutina</button>
    </form>
  `);
};

window.showAdminLoginModal = function() {
  openModal(`
    <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
        <h3 class="text-lg font-bold text-yellow-400 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]">Acceso Entrenador</h3>
        <button onclick="showMainLoginFlow()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-arrow-left"></i></button>
    </div>
    <form onsubmit="handleAdminLoginSubmit(event)" class="space-y-4">
      <div>
          <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Cédula Autorizada</label>
          <input type="text" id="l_cc" required class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium" />
      </div>
      <button type="submit" class="w-full btn-depth bg-yellow-400 text-black font-extrabold py-4 rounded-xl text-sm mt-4 shadow-[0_0_15px_rgba(255,215,0,0.4)]">Entrar al Panel Admin</button>
    </form>
  `);
};

function showModalError(message, backFunction) {
  openModal(`
    <div class="text-center space-y-6 py-6">
        <div class="w-20 h-20 inner-depth text-red-500 rounded-full flex items-center justify-center mx-auto text-4xl border border-red-500/50 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div><h3 class="text-lg font-bold text-white mb-2">Aviso del Sistema</h3><p class="text-sm text-zinc-400 leading-relaxed max-w-[80%] mx-auto font-medium">${message}</p></div>
        <div class="flex gap-3 pt-4"><button onclick="closeModal()" class="flex-1 card-depth border border-zinc-800 text-white py-3.5 rounded-xl text-sm font-bold">Cerrar</button>
        ${backFunction ? `<button onclick="(${backFunction.name})()" class="flex-1 btn-depth bg-cyan-500 text-black py-3.5 rounded-xl text-sm font-black shadow-[0_0_15px_rgba(0,229,255,0.3)]">Reintentar</button>` : ''}</div>
    </div>
  `);
}

window.handleAdminLoginSubmit = function(e) {
    e.preventDefault();
    const cc = document.getElementById('l_cc').value.trim();
    const trainer = authorizedAdmins.find(x => x.cc === cc);
    
    if(trainer) {
        state.currentUser = {role: 'admin', name: trainer.name, cc: trainer.cc};
        localStorage.setItem('gym_session', JSON.stringify(state.currentUser));
        closeModal(); renderNavbar(); renderMainContent();
    } else {
        showModalError('Cédula no autorizada o acceso denegado.', showAdminLoginModal);
    }
};

window.showClientRegisterModal = function() {
  const dToday = new Date().toISOString().split('T')[0];
  const planOptions = gymPlans.filter(p => !p.id.includes('RUTINA')).map(p => `<option value="${p.id}">${p.id} - ${p.price}</option>`).join('');
  
  openModal(`
    <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4"><h3 class="text-lg font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">Nuevo Usuario</h3><button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button></div>
    <form onsubmit="handleClientRegisterSubmit(event)" class="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <div><label class="block text-xs font-bold text-cyan-400 mb-1.5 ml-1">Seleccionar Plan</label><select id="r_c_pl" class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-black border-cyan-500/50 shadow-[0_0_10px_rgba(0,229,255,0.2)]">${planOptions}</select></div>
      <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Fecha de Ingreso</label><input type="date" id="r_c_ing" value="${dToday}" required class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium" /></div>
      <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Cédula</label><input type="text" id="r_c_cc" required class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium" /></div>
      <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Nombre Completo</label><input type="text" id="r_c_nm" required class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium" /></div>
      <div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Edad</label><input type="number" id="r_c_ag" value="25" required class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium" /></div><div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Género</label><select id="r_c_gn" class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium"><option value="M">Masc.</option><option value="F">Fem.</option></select></div></div>
      <div class="border-t border-zinc-800/50 pt-5 mt-2">
          <p class="text-sm font-bold text-cyan-400 mb-4 flex items-center gap-2 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]"><i class="fa-solid fa-weight-scale"></i> Análisis BIA</p>
          <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Peso (kg)</label><input type="number" step="0.1" id="b_wt" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" /></div>
              <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Altura (cm)</label><input type="number" id="b_ht" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" /></div>
              <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">% Grasa</label><input type="number" step="0.1" id="b_ft" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" /></div>
              <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Músculo (kg)</label><input type="number" step="0.1" id="b_ms" required class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium" /></div>
          </div>
      </div>
      <div class="grid grid-cols-2 gap-3 pt-3">
          <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Días Entreno</label>
              <select id="w_dy" class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium">
                  <option value="3">3 Días</option>
                  <option value="4" selected>4 Días</option>
                  <option value="5">5 Días</option>
                  <option value="6">6 Días</option>
              </select>
          </div>
          <div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Nivel</label>
              <select id="w_lv" class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium">
                  <option value="Principiante">Principiante</option>
                  <option value="Intermedio" selected>Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
              </select>
          </div>
      </div>
      <button type="submit" class="w-full btn-depth bg-cyan-500 text-black font-extrabold py-4 rounded-xl text-sm mt-6 shadow-[0_0_15px_rgba(0,229,255,0.4)]">Guardar y Generar Rutina</button>
    </form>
  `);
};

window.handleClientRegisterSubmit = async function(e) {
  e.preventDefault();
  const loader = document.getElementById('loading-screen');
  if(loader) {
      loader.classList.remove('hide-loader'); loader.style.opacity = '1'; loader.style.visibility = 'visible'; loader.style.zIndex = '100000';
      loader.querySelector('h1').innerHTML = '<span class="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.8)] animate-pulse">GENERANDO RUTINA IA...</span>';
  }
  
  const selectedPlanId = document.getElementById('r_c_pl').value;
  const userPlan = gymPlans.find(p => p.id === selectedPlanId) || gymPlans[0];

  const inputDateStr = document.getElementById('r_c_ing').value;
  const inputDate = new Date(inputDateStr);
  const expirationDate = new Date(inputDate.getTime() + (userPlan.durationDays * 24 * 60 * 60 * 1000));
  const dueDate = expirationDate.toISOString().split('T')[0];

  const cc = document.getElementById('r_c_cc').value.trim(); const name = document.getElementById('r_c_nm').value.trim();
  const gender = document.getElementById('r_c_gn').value; 
  const weight = Number(document.getElementById('b_wt').value); const height = Number(document.getElementById('b_ht').value);
  const fat = Number(document.getElementById('b_ft').value);
  const bmi = (weight / ((height/100) ** 2)).toFixed(1);
  let objective = "Recomposición Corporal"; if (fat > 22 && gender === 'M') objective = "Déficit Calórico"; else if (fat > 28 && gender === 'F') objective = "Déficit Calórico"; else if (fat < 15) objective = "Hipertrofia Muscular";
  
  const aiRoutine = generateAiWorkout(objective, document.getElementById('w_dy').value, document.getElementById('w_lv').value, state.inventory);
  const evalDate = new Date(inputDateStr).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const currentEval = { date: evalDate, weight, fat, muscle: Number(document.getElementById('b_ms').value), bmi };
  
  let evaluations = []; const existingIdx = state.clients.findIndex(c => c.cc === cc);
  if (existingIdx >= 0) { evaluations = state.clients[existingIdx].evaluations || []; } else if (state.historyDB[cc]) { evaluations = [...state.historyDB[cc]]; evaluations.push({ date: 'INACTIVO', weight: null, fat: null, muscle: null, bmi: null }); } evaluations.push(currentEval);

  const newRecord = { cc, name, age: Number(document.getElementById('r_c_ag').value), gender, dueDate, status: 'active', date: evalDate, profilePic: null, plan: userPlan, exerciseHistory: {}, bia: { weight, height, fat, muscle: currentEval.muscle, bmi, objective }, workout: aiRoutine, days: document.getElementById('w_dy').value, level: document.getElementById('w_lv').value, evaluations: evaluations };
  if (existingIdx >= 0) state.clients[existingIdx] = newRecord; else state.clients.push(newRecord);
  
  syncClientToDB(newRecord);
  
  if(loader) { loader.classList.add('hide-loader'); setTimeout(() => { loader.querySelector('h1').innerHTML = '<span class="text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">GYM</span> <span class="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]">FINITY</span>'; loader.style = ''; }, 600); }
  closeModal(); renderMainContent();
};

window.handleClientLoginSubmit = function(e) {
  e.preventDefault(); const cc = document.getElementById('l_c_cc').value.trim(); const client = state.clients.find(c => c.cc === cc);
  if (!client) return showModalError("Cédula no encontrada. Por favor comunícate con el entrenador.", showClientLoginModal);
  if (client.status === 'inactive') return showModalError("Su cuenta está inactiva.", showClientLoginModal);
  if (Math.ceil((new Date(client.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) < 0) return showModalError("Su mensualidad ha vencido.", showClientLoginModal);

  state.currentUser = { role: 'client', name: client.name, cc: client.cc, record: client }; localStorage.setItem('gym_session', JSON.stringify(state.currentUser));
  closeModal(); state.clientTab = 'routine'; 

  const today = new Date(); const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const futureEvents = state.events.filter(ev => ev.assignedCC === client.cc && ev.date >= todayStr && ev.attendance !== 'missed');
  futureEvents.sort((a,b) => new Date(a.date) - new Date(b.date));

  if(futureEvents.length > 0) {
      const nextEvent = futureEvents[0]; const toast = document.createElement('div'); toast.className = "bg-black/90 border border-cyan-500 p-4 rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center gap-4 animate-popup card-depth";
      toast.innerHTML = `<div class="text-cyan-400 text-3xl drop-shadow-[0_0_10px_rgba(0,229,255,0.8)]"><i class="fa-solid fa-bell animate-bounce"></i></div><div><p class="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Tu próxima cita</p><p class="text-white font-bold text-sm drop-shadow-md">${nextEvent.name}</p><p class="text-cyan-400 text-xs font-mono drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]"><i class="fa-regular fa-calendar"></i> ${nextEvent.date} a las ${nextEvent.startTime}</p></div>`;
      document.getElementById('toast-container').appendChild(toast); setTimeout(() => { toast.style.animation = "fadeOutLoader 0.5s ease-out forwards"; setTimeout(() => toast.remove(), 500); }, 4000);
  }
  renderNavbar(); renderMainContent();
};

// ==========================================
// CALENDARIO CON RESTRICCIÓN DE CRUCE
// ==========================================
window.changeMonth = function(offset) { state.calendarDate.setMonth(state.calendarDate.getMonth() + offset); renderMainContent(); };
function renderCalendarHTML(context) { 
  const year = state.calendarDate.getFullYear(); const month = state.calendarDate.getMonth(); const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const monthName = state.calendarDate.toLocaleString('es-ES', { month: 'short' }).toUpperCase(); 
  let grid = `<div class="grid grid-cols-7 gap-2 text-center mb-3">${['D','L','M','M','J','V','S'].map(d => `<div class="font-black text-zinc-500 text-sm">${d}</div>`).join('')}`;
  for (let i = 0; i < firstDay; i++) { grid += `<div></div>`; }
  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    let dayEvents = state.events.filter(e => e.date === currentDateStr); if (context === 'client' && state.currentUser) { dayEvents = dayEvents.filter(e => e.assignedCC === state.currentUser.cc); }
    let baseClass = "w-10 h-10 md:w-12 md:h-12 mx-auto flex items-center justify-center rounded-full text-sm md:text-base font-black cursor-pointer transition-all duration-300 relative z-10 ";
    if (dayEvents.length > 0) { const allAttended = dayEvents.every(e => e.attendance === 'attended'); const anyMissed = dayEvents.some(e => e.attendance === 'missed');
        if (allAttended) { baseClass += "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]"; } else if (anyMissed) { baseClass += "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]"; } else { baseClass += "bg-yellow-400 text-black shadow-[0_0_15px_rgba(255,215,0,0.6)]"; }
    } else if (currentDateStr === todayStr) { baseClass += "border-2 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.4)]"; } else { baseClass += "text-zinc-400 hover:bg-zinc-800 hover:text-white hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]"; }
    grid += `<div onclick="showEventModal('${currentDateStr}', '${context}')" class="${baseClass}">${i}</div>`;
  }
  grid += `</div>`; return `<div class="card-depth p-6 md:p-8 rounded-[2rem] border border-cyan-500/20 max-w-lg mx-auto shadow-[0_0_25px_rgba(0,229,255,0.05)] mb-8 relative z-10"><div class="flex justify-between items-center mb-6"><button onclick="changeMonth(-1)" class="w-10 h-10 rounded-full border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-black transition shadow-[0_0_10px_rgba(0,229,255,0.2)]"><i class="fa-solid fa-chevron-left"></i></button><h3 class="text-base md:text-lg font-black text-white tracking-widest drop-shadow-md">${monthName} <span class="text-cyan-400 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">${year}</span></h3><button onclick="changeMonth(1)" class="w-10 h-10 rounded-full border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-black transition shadow-[0_0_10px_rgba(0,229,255,0.2)]"><i class="fa-solid fa-chevron-right"></i></button></div>${grid}</div>`;
}

window.filterUserSearch = function(query) { 
  const resultsDiv = document.getElementById('ev_cc_results'); const hiddenInput = document.getElementById('ev_assigned_cc');
  if(!query) { resultsDiv.classList.add('hidden'); hiddenInput.value=''; return; } const matches = state.clients.filter(c => c.cc.includes(query.toLowerCase()) || c.name.toLowerCase().includes(query.toLowerCase()));
  if(matches.length > 0) { resultsDiv.innerHTML = matches.map(m => `<div onclick="selectEventUser('${m.cc}', '${m.name.replace(/'/g,"\\'")}')" class="p-3 hover:bg-zinc-800 cursor-pointer text-sm text-white font-medium border-b border-zinc-800 last:border-0">${m.name} <br><span class="text-cyan-400 font-mono text-xs drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">(CC: ${m.cc})</span></div>`).join(''); resultsDiv.classList.remove('hidden'); } else { resultsDiv.innerHTML = `<div class="p-4 text-sm text-zinc-500 font-medium">Sin resultados</div>`; resultsDiv.classList.remove('hidden'); }
};
window.selectEventUser = function(cc, name) { document.getElementById('ev_cc_search').value = `${name}`; document.getElementById('ev_assigned_cc').value = cc; document.getElementById('ev_cc_results').classList.add('hidden'); };

window.saveActivity = function(e, date) { 
    e.preventDefault(); 
    const name = document.getElementById('ev_name').value;
    const start = document.getElementById('ev_start').value;
    const end = document.getElementById('ev_end').value;
    const cc = document.getElementById('ev_assigned_cc').value || null; 
    
    if(!name || !start || !end) return; 

    const toMins = (t) => { const [h,m] = t.split(':'); return parseInt(h)*60 + parseInt(m); };
    const nStart = toMins(start);
    const nEnd = toMins(end);

    const dayEvents = state.events.filter(ev => ev.date === date);
    const hasOverlap = dayEvents.some(ev => {
        const eStart = toMins(ev.startTime);
        const eEnd = toMins(ev.endTime);
        return (nStart < eEnd && nEnd > eStart);
    });

    if (hasOverlap) {
        showModalError("Ya existe una cita agendada que se cruza con este horario. Por favor, selecciona otra hora.", null);
        return;
    }

    state.events.push({ id: Date.now(), date, name, startTime: start, endTime: end, assignedCC: cc, attendance: 'pending' }); 
    syncEventsToDB(); 
    closeModal(); 
    renderMainContent(); 
};

window.deleteEvent = function(id) { state.events = state.events.filter(e => e.id !== id); syncEventsToDB(); closeModal(); renderMainContent(); };
window.markAttendance = function(id, status) { const event = state.events.find(e => e.id === id); if(event) { event.attendance = status; syncEventsToDB(); closeModal(); renderMainContent(); } };

window.showEventModal = function(dateStr, context) { 
  let dayEvents = state.events.filter(e => e.date === dateStr); if (context === 'client' && state.currentUser) { dayEvents = dayEvents.filter(e => e.assignedCC === state.currentUser.cc); }
  let existingHTML = ''; 
  if(dayEvents.length > 0) { 
      existingHTML = `<div class="mb-6 space-y-4"><h4 class="text-xs text-zinc-400 font-bold uppercase tracking-widest border-b border-zinc-800/50 pb-2">Actividades Programadas:</h4>${dayEvents.map(e => { let bgColor = "bg-zinc-900/50", borderColor = "border-zinc-800", shadowColor = ""; if(e.attendance === 'attended') { bgColor = "bg-emerald-900/10"; borderColor = "border-emerald-500/50"; shadowColor="shadow-[0_0_10px_rgba(16,185,129,0.1)]"; } if(e.attendance === 'missed') { bgColor = "bg-red-900/10"; borderColor = "border-red-500/50"; shadowColor="shadow-[0_0_10px_rgba(239,68,68,0.1)]"; } return `<div class="inner-depth p-5 rounded-2xl flex flex-col gap-3 border ${borderColor} ${bgColor} ${shadowColor}"><div class="flex justify-between items-start"><div><strong class="text-white text-base drop-shadow-md">${e.name}</strong><br><span class="text-sm text-zinc-400 mt-1 block font-medium"><i class="fa-regular fa-clock text-zinc-500"></i> ${e.startTime} - ${e.endTime}</span>${e.assignedCC ? `<span class="text-cyan-400 font-bold text-xs mt-2 block drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">Cédula asignada: ${e.assignedCC}</span>` : ''}</div>${context === 'admin' ? `<button onclick="deleteEvent(${e.id})" class="text-zinc-500 hover:text-red-500 bg-black p-2 rounded-lg border border-red-500/20 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] transition"><i class="fa-solid fa-trash"></i></button>` : ''}</div><div class="flex gap-3 mt-3 pt-3 border-t border-zinc-800/50"><button onclick="markAttendance(${e.id}, 'attended')" class="flex-1 py-2 rounded-xl text-xs font-black transition ${e.attendance === 'attended' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[#050505] text-zinc-400 border border-zinc-700 hover:text-emerald-400 hover:border-emerald-500/50'}"><i class="fa-solid fa-check"></i> Asistió</button><button onclick="markAttendance(${e.id}, 'missed')" class="flex-1 py-2 rounded-xl text-xs font-black transition ${e.attendance === 'missed' ? 'bg-red-500/20 text-red-400 border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-[#050505] text-zinc-400 border border-zinc-700 hover:text-red-400 hover:border-red-500/50'}"><i class="fa-solid fa-xmark"></i> Faltó</button></div></div>`}).join('')}</div>`; 
  } else { existingHTML = `<div class="flex flex-col items-center justify-center p-8 text-center opacity-80 animate-fade-in"><i class="fa-regular fa-calendar-xmark text-5xl text-cyan-500/30 mb-4 animate-float drop-shadow-[0_0_10px_rgba(0,229,255,0.2)]"></i><p class="text-sm text-zinc-400 font-medium">Sin actividades para esta fecha.</p></div>`; }
  
  if (context === 'client') { openModal(`<div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4"><h3 class="text-lg font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]"><i class="fa-solid fa-calendar-day"></i> Actividades</h3><button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button></div><p class="text-sm text-zinc-400 mb-4 font-bold">Fecha: <span class="text-white">${dateStr}</span></p>${existingHTML}`); return; }
  openModal(`<div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4"><h3 class="text-lg font-bold text-yellow-400 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]"><i class="fa-solid fa-calendar-plus"></i> Gestión de Fecha</h3><button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button></div><p class="text-sm text-zinc-400 mb-4 font-bold">Fecha: <span class="text-white">${dateStr}</span></p>${existingHTML}<form onsubmit="saveActivity(event, '${dateStr}')" class="space-y-4 pt-6 border-t border-zinc-800/80"><div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Nombre Actividad</label><input type="text" id="ev_name" required class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium" /></div><div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Hora Inicio</label><input type="time" id="ev_start" required class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium" /></div><div><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Hora Fin</label><input type="time" id="ev_end" required class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium" /></div></div><div class="relative"><label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Asignar a Cliente (Opcional)</label><input type="text" id="ev_cc_search" onkeyup="filterUserSearch(this.value)" placeholder="Buscar por nombre o CC..." class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium" autocomplete="off" /><div id="ev_cc_results" class="absolute w-full z-10 max-h-40 overflow-y-auto bg-[#0a0a0a] border border-cyan-500/50 shadow-[0_0_15px_rgba(0,229,255,0.2)] rounded-xl mt-1 hidden custom-scrollbar"></div><input type="hidden" id="ev_assigned_cc"></div><button type="submit" class="w-full btn-depth bg-yellow-400 text-black font-extrabold py-4 rounded-xl text-sm mt-4 shadow-[0_0_15px_rgba(255,215,0,0.4)]">Guardar Actividad</button></form>`);
};

// ==========================================
// PANEL DE ADMINISTRADOR COMPLETO
// ==========================================
window.switchAdminTab = function(tab) { state.adminTab = tab; state.viewingClientAsAdmin = false; renderMainContent(); };

function renderAdminDashboard() { 
  const activeClients = state.clients.filter(c => c.status !== 'inactive'); const inactiveClients = state.clients.filter(c => c.status === 'inactive');
  return `
    <div class="space-y-8 animate-fade-in pb-10">
        <div class="flex flex-wrap gap-3 border-b border-zinc-900 pb-6 mb-4">
            <button onclick="switchAdminTab('profile')" class="px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${state.adminTab === 'profile' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]' : 'bg-[#0a0a0a] border border-zinc-800 text-zinc-400 hover:text-white hover:border-cyan-500/50'}"><i class="fa-solid fa-id-card"></i> Perfil</button>
            <button onclick="switchAdminTab('calendar')" class="px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${state.adminTab === 'calendar' ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]' : 'bg-[#0a0a0a] border border-zinc-800 text-zinc-400 hover:text-white hover:border-yellow-400/50'}"><i class="fa-solid fa-calendar-days"></i> Calendario</button>
            <button onclick="switchAdminTab('active_clients')" class="px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${state.adminTab === 'active_clients' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-[#0a0a0a] border border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/50'}"><i class="fa-solid fa-users"></i> Activos</button>
            <button onclick="switchAdminTab('inactive_clients')" class="px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${state.adminTab === 'inactive_clients' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-[#0a0a0a] border border-zinc-800 text-zinc-400 hover:text-white hover:border-red-500/50'}"><i class="fa-solid fa-user-slash"></i> Inactivos</button>
            <button onclick="switchAdminTab('inventory')" class="px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${state.adminTab === 'inventory' ? 'bg-zinc-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-[#0a0a0a] border border-zinc-800 text-zinc-400 hover:text-white hover:border-white/50'}"><i class="fa-solid fa-dumbbell"></i> Ejercicios</button>
            <button onclick="switchAdminTab('store')" class="px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${state.adminTab === 'store' ? 'bg-[#0be307] text-black shadow-[0_0_15px_rgba(11,227,7,0.4)]' : 'bg-[#0a0a0a] border border-zinc-800 text-zinc-400 hover:text-white hover:border-[#0be307]/50'}"><i class="fa-solid fa-store"></i> Productos</button>
            <!-- NUEVO BOTÓN RUTINAS -->
            <button onclick="switchAdminTab('routines')" class="px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all ${state.adminTab === 'routines' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-[#0a0a0a] border border-zinc-800 text-zinc-400 hover:text-white hover:border-purple-500/50'}"><i class="fa-solid fa-list-check"></i> Rutinas</button>
        </div>
        
        ${state.adminTab === 'profile' ? `
    <div class="card-depth border border-cyan-500/20 rounded-[2rem] p-10 max-w-2xl mx-auto space-y-6 shadow-[0_0_20px_rgba(0,229,255,0.05)] text-center animate-fade-in bg-[#050505]">
        <div class="w-24 h-24 rounded-full border-2 border-cyan-500 inner-depth flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(0,229,255,0.3)] mb-2">
            <i class="fa-solid fa-user-shield text-4xl text-cyan-400"></i>
        </div>
        <div>
            <p class="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">Perfil de Entrenador</p>
            <h3 class="text-3xl font-black text-white uppercase drop-shadow-md tracking-wider">${state.currentUser.name}</h3>
            <p class="text-sm text-zinc-400 font-mono mt-2">CC: ${state.currentUser.cc}</p>
        </div>
        <div class="pt-6 border-t border-zinc-800/80 mt-6">
            <button onclick="logout()" class="bg-red-900/40 text-red-400 border border-red-500/50 hover:bg-red-600 hover:text-white px-8 py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <i class="fa-solid fa-power-off mr-2"></i> Cerrar Sesión
            </button>
        </div>
    </div>` : ''}
        ${state.adminTab === 'calendar' ? renderCalendarHTML('admin') : ''}
        ${state.adminTab === 'active_clients' ? renderActiveClientsTab(activeClients) : ''}
        ${state.adminTab === 'inactive_clients' ? renderInactiveClientsTab(inactiveClients) : ''}
        ${state.adminTab === 'inventory' ? renderAdminInventory() : ''}
        ${state.adminTab === 'store' ? renderAdminStore() : ''}
        ${state.adminTab === 'routines' ? renderAdminRoutines() : ''} <!-- NUEVA SECCIÓN -->
    </div>`;
}

// Extraemos la sección de inventario para que el código quede más limpio
function renderAdminInventory() {
    return `
    <div class="card-depth border border-zinc-800 rounded-[2rem] p-8 max-w-6xl mx-auto space-y-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-zinc-800/80 pb-4">
            <h3 class="text-xl font-bold text-white flex items-center gap-3 drop-shadow-md">
                <span class="p-2.5 bg-zinc-800 rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.1)]"><i class="fa-solid fa-folder-open text-zinc-300"></i></span> 
                Base de Datos de Ejercicios
            </h3>
            <button onclick="openAddExerciseModal()" class="bg-cyan-500 hover:bg-cyan-400 text-black font-black px-5 py-3 rounded-xl text-sm shadow-[0_0_15px_rgba(0,229,255,0.4)] transition hover:scale-105 flex items-center gap-2">
            <i class="fa-solid fa-plus"></i> Añadir Ejercicio
            </button>   
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            ${[
                { name: 'Abdomen', id: 'ABDOMEN', color: '#00e5ff', shadow: 'rgba(0,229,255,0.4)' },
                { name: 'Aductores', id: 'ADUCTORES', color: '#ffd700', shadow: 'rgba(255,215,0,0.4)' },
                { name: 'Antebrazo', id: 'ANTEBRAZO', color: '#8b5cf6', shadow: 'rgba(139,92,246,0.4)' },
                { name: 'Bíceps', id: 'BICEPS', color: '#ef4444', shadow: 'rgba(239,68,68,0.4)' },
                { name: 'Cardio', id: 'CARDIO', color: '#10b981', shadow: 'rgba(16,185,129,0.4)' },
                { name: 'Cuádriceps', id: 'CUADRICEPS', color: '#f97316', shadow: 'rgba(249,115,22,0.4)' },
                { name: 'Espalda', id: 'ESPALDA', color: '#3b82f6', shadow: 'rgba(59,130,246,0.4)' },
                { name: 'Gemelos', id: 'GEMELOS', color: '#ec4899', shadow: 'rgba(236,72,153,0.4)' },
                { name: 'Glúteo', id: 'GLUTEO', color: '#ffffff', shadow: 'rgba(255,255,255,0.4)' },
                { name: 'Hombro', id: 'HOMBRO', color: '#52525b', shadow: 'rgba(255,255,255,0.2)' },
                { name: 'Isquios', id: 'ISQUIOS', color: '#d946ef', shadow: 'rgba(217,70,239,0.4)' },
                { name: 'Pecho', id: 'PECHO', color: '#14b8a6', shadow: 'rgba(20,184,166,0.4)' },
                { name: 'Tibia', id: 'TIBIA', color: '#84cc16', shadow: 'rgba(132,204,22,0.4)' },
                { name: 'Tríceps', id: 'TRICEPS', color: '#f43f5e', shadow: 'rgba(244,63,94,0.4)' }
            ].map(f => `
                <div onclick="openMuscleFolder('${f.id}', '${f.color === '#52525b' ? '#a1a1aa' : f.color}')" class="bg-[#050505] rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:scale-105 hover:-translate-y-2 transition-all duration-300 group" style="border: 1px solid ${f.color}66;" onmouseover="this.style.boxShadow='0 0 20px ${f.shadow}'" onmouseout="this.style.boxShadow='none'">
                    <i class="fa-solid fa-folder-open text-3xl group-hover:animate-bounce" style="color: ${f.color}; filter: drop-shadow(0 0 10px ${f.color === '#52525b' ? '#ffffff40' : f.color + 'CC'});"></i>
                    <span class="text-white font-black text-xs md:text-sm tracking-wider uppercase">${f.name}</span>
                </div>
            `).join('')}
        </div>
    </div>
    `;
}

// Nueva función para el panel de Tienda (Marcas/Carpetas)
function renderAdminStore() {
    return `
    <div class="card-depth border border-zinc-800 rounded-[2rem] p-8 max-w-6xl mx-auto space-y-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-zinc-800/80 pb-4">
            <h3 class="text-xl font-bold text-white flex items-center gap-3 drop-shadow-md">
                <span class="p-2.5 bg-zinc-800 rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.1)]"><i class="fa-solid fa-store text-zinc-300"></i></span> 
                Inventario de Tienda
            </h3>
            <div class="flex gap-2">
                <button onclick="openAddBrandModal()" class="bg-[#0a0a0a] border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-black px-4 py-3 rounded-xl text-xs transition hover:scale-105 flex items-center gap-2">
                <i class="fa-solid fa-folder-plus"></i> Nueva Marca
                </button> 
                <button onclick="openAddProductModal()" class="bg-[#0be307] hover:bg-[#09c006] text-black font-black px-5 py-3 rounded-xl text-sm shadow-[0_0_15px_rgba(11,227,7,0.4)] transition hover:scale-105 flex items-center gap-2">
                <i class="fa-solid fa-plus"></i> Añadir Producto
                </button>   
            </div>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            ${storeBrands.map(brandName => {
                const color = brandColors[brandName] || '#ffffff';
                const shadow = `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.4)`;
                return `
                <div onclick="openProductFolder('${brandName}', '${color}')" class="bg-[#050505] rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:scale-105 hover:-translate-y-2 transition-all duration-300 group" style="border: 1px solid ${color}66;" onmouseover="this.style.boxShadow='0 0 20px ${shadow}'" onmouseout="this.style.boxShadow='none'">
                    <i class="fa-solid fa-box-open text-3xl group-hover:animate-bounce" style="color: ${color}; filter: drop-shadow(0 0 10px ${color}CC);"></i>
                    <span class="text-white font-black text-xs md:text-sm tracking-wider uppercase">${brandName}</span>
                </div>
                `;
            }).join('')}
        </div>
    </div>
    `;
}

// ==========================================
// 3. ORGANIZACIÓN EN CUADRÍCULA DE EJERCICIOS Y BORRADO
// ==========================================
// Reemplaza la función `openMuscleFolder` (línea 1090 aprox) por esta:

window.openMuscleFolder = function(muscleGroup, colorHex) {
    const exercisesInGroup = Object.keys(exerciseDetails).filter(name => {
        const exData = exerciseDetails[name];
        if (exData.folder) return exData.folder.toUpperCase() === muscleGroup.toUpperCase();
        return exData.img.toUpperCase().includes(`/${muscleGroup}/`);
    });

    let html = `
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md" style="color: ${colorHex};">
                <i class="fa-solid fa-folder-open"></i> ${muscleGroup}
            </h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        
        <div class="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
    `;

    if (exercisesInGroup.length === 0) {
        html += `<div class="p-8 text-center text-zinc-500 font-medium">No hay ejercicios registrados en esta categoría.</div>`;
    } else {
        html += `<div class="grid grid-cols-2 gap-4">`; // GRID 2 COLUMNAS
        
        exercisesInGroup.forEach(exName => {
            const exData = exerciseDetails[exName];
            const safeName = exName.replace(/'/g, "\\'");
            const safeImg = exData.img.replace(/'/g, "\\'");
            const safeDesc = exData.desc.replace(/'/g, "\\'");

            html += `
            <div class="bg-[#050505] border-2 rounded-xl p-3 flex flex-col items-center justify-between gap-2 transition-colors relative overflow-hidden group shadow-md" style="border-color: ${colorHex}50; height: 140px;">
                
                <!-- Bóton eliminar (Solo borra de la memoria personalizada) -->
                <button onclick="deleteCustomExercise('${safeName}')" class="absolute top-2 right-2 w-6 h-6 bg-red-900/60 rounded flex items-center justify-center text-red-400 hover:text-white hover:bg-red-600 transition z-10 opacity-0 group-hover:opacity-100" title="Eliminar de base de datos">
                    <i class="fa-solid fa-trash text-[10px]"></i>
                </button>

                <div onclick="viewExerciseDetails('${safeName}', '${safeImg}', '${safeDesc}', '${colorHex}')" class="w-full flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer pt-3">
                    <div class="w-14 h-14 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center border border-zinc-200 shadow-inner group-hover:scale-105 transition-transform">
                        <img src="${exData.img}" class="w-full h-full object-contain mix-blend-multiply" onerror="gymImgFix(this)" />
                    </div>
                    <span class="text-[10px] font-bold text-white uppercase text-center leading-tight line-clamp-2" style="color: ${colorHex}; drop-shadow(0 0 2px ${colorHex}80);">${exName}</span>
                </div>
            </div>
            `;
        });
        
        html += `</div>`;
    }

    html += `</div>`;
    openModal(html);
};

// Función para eliminar un ejercicio de la BD local
window.deleteCustomExercise = function(exName) {
    if(confirm(`¿Estás seguro de que deseas eliminar permanentemente el ejercicio "${exName}" de la base de datos?`)) {
        // Eliminar del objeto en memoria
        delete exerciseDetails[exName];
        
        // Eliminar del almacenamiento local (si es un ejercicio creado por el usuario)
        let customEx = JSON.parse(localStorage.getItem('gymFinityCustomEx')) || {};
        if (customEx[exName]) {
            delete customEx[exName];
            localStorage.setItem('gymFinityCustomEx', JSON.stringify(customEx));
        }
        
        closeModal();
        alert(`Ejercicio eliminado correctamente.`);
    }
};

// ==========================================
// 4. FUNCIONES PARA EL PANEL DE PRODUCTOS
// ==========================================

// ==========================================
// 4. FUNCIONES PARA EL PANEL DE PRODUCTOS
// ==========================================

window.openProductFolder = function(brand, colorHex) {
    const productsInBrand = storeProducts.filter(p => p.brand === brand);

    let html = `
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md" style="color: ${colorHex};">
                <i class="fa-solid fa-box-open"></i> ${brand}
            </h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        
        <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
    `;

    if (productsInBrand.length === 0) {
        html += `<div class="p-8 text-center text-zinc-500 font-medium">No hay productos registrados en esta marca.</div>`;
    } else {
        productsInBrand.forEach((p, idx) => {
            const safeName = p.name.replace(/'/g, "\\'");
            
            html += `
            <div class="bg-[#050505] border border-zinc-800/80 rounded-xl p-3 flex items-center gap-4 hover:border-zinc-500 transition-colors group relative overflow-hidden" style="border-left-color: ${colorHex}; border-left-width: 4px;">
                
                <!-- Área clickeable para EDITAR producto -->
                <div onclick="editProductModal('${safeName}', '${brand}', '${colorHex}')" class="flex-1 flex items-center gap-4 cursor-pointer">
                    <div class="w-16 h-16 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center border border-zinc-200 shadow-inner group-hover:scale-105 transition-transform">
                        <img src="${p.img}" class="w-full h-full object-contain mix-blend-multiply" onerror="this.src='PRODUCTOS/DEFAULT.png'" />
                    </div>
                    <div class="flex-1 flex flex-col justify-center">
                        <span class="text-xs font-black text-zinc-500 uppercase tracking-widest">${p.type}</span>
                        <span class="text-sm font-bold text-white uppercase drop-shadow-md group-hover:text-zinc-200 transition">${p.name}</span>
                        <span class="text-xs font-black mt-1" style="color: ${colorHex};">${p.price}</span>
                    </div>
                    <!-- Icono de lápiz (solo aparece al pasar el mouse) -->
                    <i class="fa-solid fa-pen text-zinc-600 group-hover:text-white transition opacity-50 group-hover:opacity-100 pr-2"></i>
                </div>
                
                <!-- Botón Basura -->
                <button onclick="event.stopPropagation(); deleteProduct('${safeName}', '${brand}')" class="w-10 h-10 flex shrink-0 items-center justify-center bg-red-900/30 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition shadow-md z-10" title="Eliminar producto">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            `;
        });
    }

    html += `</div>`;
    openModal(html);
};

window.deleteProduct = function(productName, brand) {
    if(confirm(`¿Estás seguro de que deseas eliminar el producto "${productName}" de la tienda?`)) {
        const idx = storeProducts.findIndex(p => p.name === productName && p.brand === brand);
        if(idx > -1) {
            storeProducts.splice(idx, 1);
            alert("Producto eliminado.");
            closeModal();
        }
    }
};

// ==========================================
// NUEVO: MODAL PARA EDITAR EL PRODUCTO
// ==========================================
window.editProductModal = function(productName, currentBrand, colorHex) {
    const productIndex = storeProducts.findIndex(p => p.name === productName && p.brand === currentBrand);
    if (productIndex === -1) return;
    const p = storeProducts[productIndex];
    const safeName = p.name.replace(/'/g, "\\'");

    // Generar opciones de marcas (carpetas) y preseleccionar la actual
    const brandsOptions = storeBrands.map(b => 
        `<option value="${b}" ${b === p.brand ? 'selected' : ''}>${b}</option>`
    ).join('');

    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-md mx-auto w-full animate-scale-up" style="border-color: ${colorHex};">
            <!-- Botón Volver -->
            <button onclick="openProductFolder('${currentBrand}', '${colorHex}')" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition" title="Volver a la carpeta">
                <i class="fa-solid fa-arrow-left text-xl"></i>
            </button>
            
            <h3 class="text-xl font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2" style="color: ${colorHex};">
                <i class="fa-solid fa-pen"></i> Editar Producto
            </h3>
            
            <form onsubmit="saveProductEdit(event, '${safeName}', '${currentBrand}')" class="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                
                <!-- Vista previa de la imagen -->
                <div class="flex justify-center mb-4">
                    <div class="w-32 h-32 md:w-40 md:h-40 bg-white rounded-xl p-2 flex items-center justify-center border-2 shadow-inner transition-transform hover:scale-105" style="border-color: ${colorHex}50;">
                        <img src="${p.img}" class="w-full h-full object-contain mix-blend-multiply" onerror="this.src='PRODUCTOS/DEFAULT.png'" />
                    </div>
                </div>
                
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre del Producto</label>
                    <input type="text" id="e_prod_name" value="${p.name}" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-white outline-none transition mt-1" required>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Precio</label>
                        <input type="text" id="e_prod_price" value="${p.price}" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-white outline-none transition mt-1" required>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Marca / Carpeta</label>
                        <select id="e_prod_brand" class="w-full bg-[#0a0a0a] border border-zinc-800 text-white rounded-xl px-3 py-3 focus:outline-none transition cursor-pointer mt-1" style="border-color: ${colorHex}50;">
                            ${brandsOptions}
                        </select>
                    </div>
                </div>
                
                <button type="submit" class="w-full text-black font-black uppercase tracking-widest py-3.5 rounded-xl transition hover:scale-105 mt-4" style="background-color: ${colorHex}; box-shadow: 0 0 15px ${colorHex}40;">
                    Guardar Cambios
                </button>
            </form>
        </div>
    `;
    openModal(html);
};

// ==========================================
// NUEVO: GUARDAR LA EDICIÓN DEL PRODUCTO
// ==========================================
window.saveProductEdit = function(e, oldName, oldBrand) {
    e.preventDefault();
    
    const newName = document.getElementById('e_prod_name').value.trim();
    const newPrice = document.getElementById('e_prod_price').value.trim();
    const newBrand = document.getElementById('e_prod_brand').value;
    
    const productIndex = storeProducts.findIndex(p => p.name === oldName && p.brand === oldBrand);
    if (productIndex !== -1) {
        // Actualizamos los datos en el array
        storeProducts[productIndex].name = newName;
        storeProducts[productIndex].price = newPrice;
        storeProducts[productIndex].brand = newBrand;
        
        // Buscamos el color de la nueva carpeta para reabrirla
        let newColor = "#00e5ff"; // Por defecto
        if (typeof brandColors !== 'undefined' && brandColors[newBrand]) {
            newColor = brandColors[newBrand];
        }
        
        // Abre la carpeta de la marca seleccionada automáticamente
        openProductFolder(newBrand, newColor);
    }
};
// Modal para añadir producto
window.openAddProductModal = function() {
    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-md mx-auto w-full animate-scale-up" style="border-color: #0be307;">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
            <h3 class="text-xl font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2"><i class="fa-solid fa-box text-[#0be307]"></i> Añadir Producto</h3>
            <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sube Imagen (PNG transparente ideal)</label>
                    <input type="file" accept="image/*" onchange="previewNewProductImage(event)" class="w-full mt-1 text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-zinc-800 file:text-[#0be307] hover:file:bg-zinc-700 transition cursor-pointer">
                    <input type="hidden" id="n_p_img">
                </div>
                
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre del Producto</label>
                    <input type="text" id="n_p_name" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-[#0be307] outline-none transition mt-1" placeholder="Ej. Whey Protein 2LB">
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Marca / Carpeta</label>
                        <select id="n_p_brand" class="w-full bg-[#0a0a0a] border border-zinc-800 text-white rounded-xl px-3 py-3 focus:outline-none focus:border-[#0be307] transition cursor-pointer mt-1">
                            <option value="" disabled selected>Marca...</option>
                            ${storeBrands.map(b => `<option value="${b}">${b}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipo (Categoría)</label>
                        <input type="text" id="n_p_type" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-[#0be307] outline-none transition mt-1" placeholder="Ej. Proteínas">
                    </div>
                </div>

                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor (Precio)</label>
                    <input type="text" id="n_p_price" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-[#0be307] outline-none transition mt-1" placeholder="Ej. $150.000">
                </div>

                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Descripción</label>
                    <textarea id="n_p_desc" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-[#0be307] outline-none transition mt-1 h-20 resize-none" placeholder="Beneficios del producto..."></textarea>
                </div>
                
                <button onclick="saveNewProduct()" class="w-full bg-[#0be307] text-black font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-[#09c006] transition hover:scale-105 mt-2">Añadir al Inventario</button>
            </div>
        </div>
    `;
    openModal(html);
};

window.previewNewProductImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('n_p_img').value = e.target.result; };
        reader.readAsDataURL(file);
    }
};

window.saveNewProduct = function() {
    const name = document.getElementById('n_p_name').value.trim();
    const brand = document.getElementById('n_p_brand').value;
    const type = document.getElementById('n_p_type').value.trim();
    const price = document.getElementById('n_p_price').value.trim();
    const desc = document.getElementById('n_p_desc').value.trim();
    const imgBase64 = document.getElementById('n_p_img').value;

    if(!name || !brand || !type || !price || !imgBase64) { 
        alert("Completa todos los campos obligatorios y sube una imagen."); return; 
    }

    // Se agrega al arreglo (En un caso real, esto se guardaría en Firebase)
    storeProducts.push({
        brand: brand,
        type: type,
        name: name,
        img: imgBase64,
        desc: desc,
        price: price
    });

    alert(`Producto ${name} añadido a la marca ${brand}.`);
    closeModal();
};

// Modal para añadir nueva marca/carpeta
window.openAddBrandModal = function() {
    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-sm mx-auto w-full animate-scale-up border-zinc-600">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
            <h3 class="text-xl font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2"><i class="fa-solid fa-folder-plus text-zinc-400"></i> Nueva Marca</h3>
            <div class="space-y-4">
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre de la Marca</label>
                    <input type="text" id="n_b_name" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white outline-none transition mt-1 uppercase" placeholder="Ej. OPTIMUM NUTRITION">
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Color Hexadecimal (Para las tarjetas)</label>
                    <input type="color" id="n_b_color" class="w-full h-12 bg-[#0a0a0a] border border-zinc-800 rounded-xl cursor-pointer mt-1" value="#ffffff">
                </div>
                
                <button onclick="saveNewBrand()" class="w-full bg-zinc-200 text-black font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-white transition hover:scale-105 mt-4">Crear Carpeta</button>
            </div>
        </div>
    `;
    openModal(html);
};

window.saveNewBrand = function() {
    const brandName = document.getElementById('n_b_name').value.trim().toUpperCase();
    const colorHex = document.getElementById('n_b_color').value;

    if(!brandName) { alert("Ingresa un nombre para la marca."); return; }
    
    if(storeBrands.includes(brandName)) {
        alert("Esta marca ya existe."); return;
    }

    storeBrands.push(brandName);
    brandColors[brandName] = colorHex;

    alert(`Marca ${brandName} creada.`);
    closeModal();
    renderMainContent(); // Refresca el panel para mostrar la nueva carpeta
};

// ==========================================
// FILTRO EN TIEMPO REAL PARA LA TABLA DE CLIENTES
// ==========================================
window.filterClientsTable = function(query) {
    const q = query.toLowerCase().trim();
    // Filtramos las filas de la tabla de escritorio
    const desktopRows = document.querySelectorAll('#desktop-clients-table tbody tr');
    desktopRows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(q)) row.style.display = '';
        else row.style.display = 'none';
    });
    
    // Filtramos las tarjetas de la vista móvil
    const mobileCards = document.querySelectorAll('#mobile-clients-list > div');
    mobileCards.forEach(card => {
        const text = card.innerText.toLowerCase();
        if (text.includes(q)) card.style.display = '';
        else card.style.display = 'none';
    });
};

// ==========================================
// RENDERIZADO DE CLIENTES ACTIVOS
// ==========================================
function renderActiveClientsTab(clients) { 
  // Botones de acción y barra de búsqueda
  const headerActions = `
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center px-2 gap-4 w-full">
        <h3 class="text-xl font-bold text-white flex items-center gap-3 drop-shadow-md whitespace-nowrap">
            <span class="p-2.5 bg-cyan-500/10 rounded-xl shadow-[0_0_10px_rgba(0,229,255,0.2)]"><i class="fa-solid fa-users text-cyan-400"></i></span> 
            Usuarios Activos
        </h3>
        
        <!-- BUSCADOR -->
        <div class="relative w-full md:max-w-xs flex-1 shrink-0">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fa-solid fa-magnifying-glass text-zinc-500"></i>
            </div>
            <input type="text" onkeyup="filterClientsTable(this.value)" placeholder="Buscar por nombre o CC..." class="w-full bg-[#050505] border border-zinc-800 text-white text-sm rounded-xl focus:border-cyan-500 block pl-10 p-2.5 outline-none transition-colors shadow-inner placeholder-zinc-600">
        </div>

        <!-- BOTONES FIX: Quitamos overflow-x-auto y usamos flex-wrap -->
        <div class="flex flex-wrap gap-3 w-full md:w-auto justify-start md:justify-end shrink-0">
            <button onclick="showBulkImportModal()" class="flex-1 md:flex-none bg-yellow-400 text-black px-5 py-2.5 rounded-xl text-xs font-black shadow-[0_0_10px_rgba(255,215,0,0.3)] hover:scale-105 transition flex items-center justify-center gap-2 whitespace-nowrap">
                <i class="fa-solid fa-file-import"></i> Importar Excel
            </button>
            <button onclick="showClientRegisterModal()" class="flex-1 md:flex-none bg-cyan-500 text-black px-5 py-2.5 rounded-xl text-xs font-black shadow-[0_0_10px_rgba(0,229,255,0.3)] hover:scale-105 transition flex items-center justify-center gap-2 whitespace-nowrap">
                <i class="fa-solid fa-user-plus"></i> Nuevo Usuario
            </button>
        </div>
    </div>
  `;

  if (clients.length === 0) return `<div class="flex flex-col items-center justify-center p-16 opacity-80 animate-fade-in"><i class="fa-solid fa-user-astronaut text-6xl text-cyan-500/30 mb-6 animate-float drop-shadow-[0_0_15px_rgba(0,229,255,0.2)]"></i><p class="text-base text-zinc-400 font-medium mb-6">Aún no tienes usuarios activos registrados.</p><div class="flex justify-center">${headerActions}</div></div>`;
  
  return `
    <div class="space-y-4">
        ${headerActions}
        
        <!-- VISTA MÓVIL -->
        <div id="mobile-clients-list" class="block md:hidden space-y-4">
            ${clients.map(c => { 
                const daysLeft = Math.ceil((new Date(c.dueDate) - new Date()) / (1000 * 60 * 60 * 24)); 
                return `
                <div class="card-depth p-5 rounded-[2rem] flex flex-col gap-4 border border-cyan-500/20">
                    <div class="flex justify-between items-start">
                        <div>
                            <strong class="text-white text-base drop-shadow-md">${c.name}</strong><br>
                            <span class="text-xs text-cyan-400 font-mono mt-1 block drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">CC: ${c.cc}</span>
                        </div>
                        <span class="px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-md ${daysLeft < 0 ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'}">${daysLeft < 0 ? 'VENCIDO' : daysLeft + ' días'}</span>
                    </div>
                    <div class="bg-[#050505] p-3 rounded-xl border border-zinc-800 text-xs text-zinc-400 flex justify-around font-medium">
                        <span>Peso: <strong class="text-white">${c.bia.weight}kg</strong></span>
                        <span>Grasa: <strong class="text-white">${c.bia.fat}%</strong></span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="viewClientRoutine('${c.cc}')" class="flex-1 bg-cyan-500 text-black py-2.5 rounded-xl text-xs font-black shadow-[0_0_10px_rgba(0,229,255,0.3)]"><i class="fa-solid fa-eye"></i> Ver / Editar</button>
                        <button onclick="toggleClientStatus('${c.cc}', 'inactive')" class="flex-1 bg-[#050505] text-zinc-400 border border-zinc-700 py-2.5 rounded-xl text-xs font-bold hover:text-red-400 hover:border-red-500/50 transition"><i class="fa-solid fa-user-slash"></i> Inactivar</button>
                    </div>
                </div>` 
            }).join('')}
        </div>

        <!-- VISTA ESCRITORIO -->
        <div class="hidden md:block card-depth rounded-[2rem] p-8 overflow-x-auto border border-cyan-500/20 custom-scrollbar">
            <table id="desktop-clients-table" class="w-full text-left text-sm text-zinc-300">
                <thead class="text-zinc-500 uppercase text-xs tracking-wider border-b border-zinc-800">
                    <tr><th class="p-4 font-bold">Cliente</th><th class="p-4 font-bold">Vencimiento</th><th class="p-4 font-bold">Datos BIA</th><th class="p-4 font-bold text-center">Acciones</th></tr>
                </thead>
                <tbody class="divide-y divide-zinc-800/50">
                    ${clients.map(c => { 
                        const daysLeft = Math.ceil((new Date(c.dueDate) - new Date()) / (1000 * 60 * 60 * 24)); 
                        return `
                        <tr class="hover:bg-[#0a0a0a] transition-all">
                            <td class="p-4">
                                <strong class="text-white drop-shadow-md">${c.name}</strong><br>
                                <span class="text-xs text-cyan-400 font-mono drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">CC: ${c.cc}</span>
                            </td>
                            <td class="p-4">
                                <span class="px-3 py-1.5 rounded-lg text-xs font-bold shadow-md ${daysLeft < 0 ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'}">${c.dueDate} (${daysLeft < 0 ? 'VENCIDO' : daysLeft + ' días'})</span>
                            </td>
                            <td class="p-4 text-xs text-zinc-400 font-medium">
                                Peso: <strong class="text-white">${c.bia.weight}kg</strong> | Grasa: <strong class="text-white">${c.bia.fat}%</strong>
                            </td>
                            <td class="p-4 text-center space-x-2 whitespace-nowrap">
                                <button onclick="viewClientRoutine('${c.cc}')" class="bg-cyan-500 text-black px-6 py-2.5 rounded-full text-xs font-extrabold hover:scale-105 transition shadow-[0_0_10px_rgba(0,229,255,0.4)]"><i class="fa-solid fa-eye"></i> Ver / Editar</button>
                                <button onclick="toggleClientStatus('${c.cc}', 'inactive')" class="bg-[#050505] text-zinc-300 border border-zinc-700 px-6 py-2.5 rounded-full text-xs font-bold hover:bg-zinc-800 hover:text-red-400 hover:border-red-500/50 transition"><i class="fa-solid fa-user-slash"></i> Inactivar</button>
                            </td>
                        </tr>`; 
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}
function renderInactiveClientsTab(clients) { 
  if (clients.length === 0) return `<div class="flex flex-col items-center justify-center p-16 opacity-80 animate-fade-in"><i class="fa-solid fa-user-shield text-6xl text-red-500/30 mb-6 animate-float drop-shadow-[0_0_15px_rgba(239,68,68,0.2)]"></i><p class="text-base text-zinc-400 font-medium">No hay usuarios inactivos o retirados.</p></div>`;
  return `<div class="space-y-4"><h3 class="text-xl font-bold text-white flex items-center gap-3 px-2 drop-shadow-md"><span class="p-2.5 bg-red-500/10 rounded-xl shadow-[0_0_10px_rgba(239,68,68,0.2)]"><i class="fa-solid fa-user-slash text-red-400"></i></span> Inactivos</h3><div class="block md:hidden space-y-4">${clients.map(c => `<div class="card-depth p-5 rounded-[2rem] flex flex-col gap-4 border border-red-500/30"><div class="flex justify-between items-start"><div><strong class="text-white text-base drop-shadow-md">${c.name}</strong><br><span class="text-xs text-red-400 font-mono mt-1 block drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">CC: ${c.cc}</span></div><span class="px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-[#050505] border border-zinc-800 text-zinc-500 shadow-md">Inactivo</span></div><div class="text-xs text-zinc-500 font-medium"><i class="fa-regular fa-calendar"></i> Última Eval: ${c.date}</div><div class="flex gap-2"><button onclick="toggleClientStatus('${c.cc}', 'active')" class="flex-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 py-2.5 rounded-xl text-xs font-bold transition hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_10px_rgba(16,185,129,0.4)]"><i class="fa-solid fa-user-check"></i> Reactivar</button><button onclick="confirmDeleteUser('${c.cc}')" class="flex-1 bg-red-900/40 text-red-400 border border-red-500/50 py-2.5 rounded-xl text-xs font-bold transition hover:bg-red-600 hover:text-white hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]"><i class="fa-solid fa-trash-can"></i> Borrar</button></div></div>`).join('')}</div><div class="hidden md:block card-depth rounded-[2rem] p-8 overflow-x-auto border border-red-500/30"><table class="w-full text-left text-sm text-zinc-300"><thead class="text-zinc-500 uppercase text-xs tracking-wider border-b border-zinc-800"><tr><th class="p-4 font-bold">Cliente</th><th class="p-4 font-bold">Última Eval</th><th class="p-4 font-bold">Estado</th><th class="p-4 font-bold text-center">Acciones</th></tr></thead><tbody class="divide-y divide-zinc-800/50">${clients.map(c => `<tr class="hover:bg-[#0a0a0a] transition-all"><td class="p-4"><strong class="text-white drop-shadow-md">${c.name}</strong><br><span class="text-xs text-red-400 font-mono drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">CC: ${c.cc}</span></td><td class="p-4 text-zinc-400 font-medium">${c.date}</td><td class="p-4"><span class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#050505] border border-zinc-800 text-zinc-500 shadow-md">Inactivo</span></td><td class="p-4 text-center space-x-2 whitespace-nowrap"><button onclick="toggleClientStatus('${c.cc}', 'active')" class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-5 py-2.5 rounded-full text-xs font-bold hover:bg-emerald-500 hover:text-black transition shadow-[0_0_10px_rgba(16,185,129,0.2)]"><i class="fa-solid fa-user-check"></i> Reactivar</button><button onclick="confirmDeleteUser('${c.cc}')" class="bg-red-900/40 text-red-400 border border-red-500/50 px-5 py-2.5 rounded-full text-xs font-bold hover:bg-red-600 hover:text-white transition shadow-[0_0_10px_rgba(239,68,68,0.2)]"><i class="fa-solid fa-trash-can"></i> Borrar</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

window.toggleClientStatus = function(cc, status) { const c = state.clients.find(x => x.cc === cc); if (c) { c.status = status; syncClientToDB(c); renderMainContent(); } };
window.viewClientRoutine = function(cc) { const c = state.clients.find(x => x.cc === cc); if (c) { state.viewingClientAsAdmin = true; state.selectedClientRecord = c; renderMainContent(); } };
window.backToAdminPanel = function() { state.viewingClientAsAdmin = false; state.selectedClientRecord = null; renderMainContent(); };
window.confirmDeleteUser = function(cc) {
  const client = state.clients.find(c => c.cc === cc); if (!client) return;
  openModal(`<div class="text-center space-y-6 py-4"><div class="w-20 h-20 inner-depth text-red-500 rounded-full flex items-center justify-center mx-auto text-4xl border border-red-500/50 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"><i class="fa-solid fa-trash-can"></i></div><div><h3 class="text-lg font-bold text-white mb-2">¿Borrar Definitivamente?</h3><p class="text-sm text-zinc-400 leading-relaxed max-w-[90%] mx-auto font-medium">Se eliminarán los datos de <strong class="text-white">${client.name}</strong>, pero su progreso se guardará en el historial del sistema.</p></div><div class="flex gap-3 pt-4"><button onclick="closeModal()" class="flex-1 card-depth border border-zinc-800 text-zinc-300 py-3.5 rounded-xl text-sm font-bold">Cancelar</button><button onclick="deleteUserPermanently('${cc}')" class="flex-1 btn-depth bg-red-600 text-white py-3.5 rounded-xl text-sm font-black shadow-[0_0_15px_rgba(239,68,68,0.4)]">Sí, Borrar</button></div></div>`);
};
window.deleteUserPermanently = function(cc) { 
  const client = state.clients.find(c => c.cc === cc);
  if(client && client.evaluations) { state.historyDB[cc] = client.evaluations; syncHistoryToDB(); }
  state.clients = state.clients.filter(c => c.cc !== cc); deleteClientFromDB(cc); closeModal(); renderMainContent(); 
};

window.toggleProgressChart = function() { const w = document.getElementById('chart-wrapper'), i = document.getElementById('chart-toggle-icon'), t = document.getElementById('chart-toggle-text'); if (w.classList.contains('hidden')) { w.classList.remove('hidden'); i.classList.replace('fa-chevron-down', 'fa-chevron-up'); t.innerText = 'Ocultar'; } else { w.classList.add('hidden'); i.classList.replace('fa-chevron-up', 'fa-chevron-down'); t.innerText = 'Mostrar'; } };

window.initProgressChart = function() { 
    const c = state.viewingClientAsAdmin ? state.selectedClientRecord : (state.clients.find(x => x.cc === state.currentUser.cc) || state.currentUser.record); 
    if (!c || !c.evaluations || c.evaluations.length === 0) return; 
    const ctx = document.getElementById('progressChart'); if (!ctx) return; 
    if (progressChartInstance) progressChartInstance.destroy(); 
    
    const labels = c.evaluations.map(e => e.date); 
    const weightData = c.evaluations.map(e => e.weight);
    const fatData = c.evaluations.map(e => e.fat); 
    const muscleData = c.evaluations.map(e => e.muscle); 
    const bmiData = c.evaluations.map(e => e.bmi); 
    
    progressChartInstance = new Chart(ctx, { 
        type: 'line', 
        data: { 
            labels, 
            datasets: [ 
                { label: 'Peso (kg)', data: weightData, borderColor: '#eab308', backgroundColor: '#eab308', tension: 0.3, borderWidth: 3, spanGaps: false },
                { label: '% Grasa', data: fatData, borderColor: '#ef4444', backgroundColor: '#ef4444', tension: 0.3, borderWidth: 3, spanGaps: false }, 
                { label: 'Músculo', data: muscleData, borderColor: '#10b981', backgroundColor: '#10b981', tension: 0.3, borderWidth: 3, spanGaps: false }, 
                { label: 'IMC', data: bmiData, borderColor: '#3b82f6', backgroundColor: '#3b82f6', tension: 0.3, borderWidth: 3, spanGaps: false } 
            ] 
        }, 
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { labels: { color: '#fff', font: { family: 'Outfit', weight: 'bold' } } } }, 
            scales: { x: { ticks: { color: '#6b7280' }, grid: { color: '#111' } }, y: { ticks: { color: '#6b7280' }, grid: { color: '#111' } } } 
        } 
    }); 
};

window.logout = function() { state.currentUser = null; state.viewingClientAsAdmin = false; localStorage.removeItem('gym_session'); renderNavbar(); renderMainContent(); };

// ==========================================
// IMPORTADOR MASIVO DESDE EXCEL Y CAMBIO DE PLAN
// ==========================================

window.showBulkImportModal = function() {
    openModal(`
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-lg font-bold text-yellow-400 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]"><i class="fa-solid fa-file-excel"></i> Importar desde Excel</h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div class="space-y-4">
            <div class="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl">
                <p class="text-xs text-blue-400 font-bold"><i class="fa-solid fa-circle-info"></i> Copia las filas de tu Excel y pégalas abajo. Asegúrate de que las columnas estén en este orden exacto:</p>
                <p class="text-[10px] text-white font-mono mt-2 bg-black/50 p-2 rounded tracking-widest text-center">CC | NOMBRE | GENERO | FECHA INICIO | FECHA FINAL | OBJETIVO | PLAN</p>
            </div>
            <textarea id="bulk_data" rows="8" class="w-full bg-[#0a0a0a] border border-zinc-700 focus:border-yellow-400 rounded-xl p-3 text-xs text-zinc-300 font-mono custom-scrollbar" placeholder="Ejemplo:
1022991234	Juan Perez	M	01/10/2026	01/11/2026	Bajar Grasa	Mensualidad Básica..."></textarea>
            
            <div>
                <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">¿A qué Plan de Gym Finity Pro los asignamos por defecto?</label>
                <select id="bulk_new_plan" class="w-full input-gym rounded-xl p-3 text-sm text-white font-medium border-yellow-500/50">
                    ${gymPlans.map(p => `<option value="${p.id}">${p.id} - ${p.price}</option>`).join('')}
                </select>
            </div>

            <button onclick="processBulkImport()" class="w-full btn-depth bg-yellow-400 text-black font-extrabold py-4 rounded-xl text-sm mt-2 shadow-[0_0_15px_rgba(255,215,0,0.4)]"><i class="fa-solid fa-rocket"></i> Migrar Usuarios Ahora</button>
        </div>
    `);
};

window.processBulkImport = function() {
    const data = document.getElementById('bulk_data').value.trim();
    if (!data) return alert("Pega los datos del Excel primero.");

    const newPlanId = document.getElementById('bulk_new_plan').value;
    const userPlan = gymPlans.find(p => p.id === newPlanId) || gymPlans[0];
    const rows = data.split('\n');
    let importedCount = 0;

    const loader = document.getElementById('loading-screen');
    if(loader) { loader.classList.remove('hide-loader'); loader.style.opacity = '1'; loader.style.visibility = 'visible'; loader.style.zIndex = '100000'; loader.querySelector('h1').innerHTML = '<span class="text-yellow-400 animate-pulse">MIGRANDO USUARIOS...</span>'; }

    rows.forEach(row => {
        const cols = row.split('\t'); 
        if (cols.length >= 7) { 
            const cc = cols[0].trim();
            const name = cols[1].trim();
            const gender = cols[2].trim().toUpperCase().startsWith('F') ? 'F' : 'M';
            const dateIn = cols[3].trim();
            const dateOut = cols[4].trim();
            const obj = cols[5].trim();
            const oldPlan = cols[6].trim();

            let dueDate = dateOut; 
            if (dateOut.includes('/')) {
                const parts = dateOut.split('/');
                if(parts.length === 3) {
                    dueDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`; 
                }
            } else if (dateOut.includes('-') && dateOut.split('-')[0].length === 2) {
                const parts = dateOut.split('-');
                dueDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            }

            const aiRoutine = generateAiWorkout(obj, "4", "Intermedio", state.inventory);
            
            // AQUÍ YA ESTÁ INTEGRADO EL TEMPORIZADOR "migratedAt"
            const newRecord = {
                cc: cc, name: name, age: 25, gender: gender, 
                dueDate: dueDate, status: 'active', date: dateIn, profilePic: null, 
                plan: userPlan, exerciseHistory: {}, 
                bia: { weight: 70, height: 170, fat: 20, muscle: 30, bmi: "24.2", objective: obj }, 
                workout: aiRoutine, days: "4", level: "Intermedio", evaluations: [],
                isMigrated: true, 
                oldPlanName: oldPlan,
                migratedAt: new Date().toISOString() // Temporizador automático de 30 días
            };

            const existingIdx = state.clients.findIndex(c => c.cc === cc);
            if (existingIdx >= 0) state.clients[existingIdx] = newRecord; 
            else state.clients.push(newRecord);
            
            syncClientToDB(newRecord);
            importedCount++;
        }
    });

    setTimeout(() => {
        if(loader) { loader.classList.add('hide-loader'); setTimeout(() => { loader.style = ''; }, 600); }
        closeModal();
        alert(`¡Éxito! Se migraron ${importedCount} usuarios pioneros correctamente.`);
        renderMainContent();
    }, 1500);
};

// ==========================================
// CAMBIAR PLAN DE USUARIO DESDE EL PERFIL
// ==========================================
window.showChangePlanModal = function(cc) {
    const client = state.clients.find(c => c.cc === cc);
    if(!client) return;
    
    const planOptions = gymPlans.map(p => `<option value="${p.id}" ${client.plan.id === p.id ? 'selected' : ''}>${p.id} - ${p.price}</option>`).join('');
    
    openModal(`
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-lg font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]"><i class="fa-solid fa-exchange-alt"></i> Asignar Nuevo Plan</h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <form onsubmit="saveNewUserPlan(event, '${cc}')" class="space-y-4">
            <p class="text-xs text-zinc-400 font-medium mb-4">Selecciona el plan definitivo al que deseas trasladar al usuario <strong class="text-white">${client.name}</strong>.</p>
            <div>
                <label class="block text-xs font-bold text-zinc-400 mb-1.5 ml-1">Seleccionar Plan</label>
                <select id="edit_u_plan" class="w-full input-gym rounded-xl p-3.5 text-sm text-white font-medium border-cyan-500/50">
                    ${planOptions}
                </select>
            </div>
            <button type="submit" class="w-full btn-depth bg-cyan-500 text-black font-extrabold py-4 rounded-xl text-sm mt-4 shadow-[0_0_15px_rgba(0,229,255,0.4)]">Actualizar Plan</button>
        </form>
    `);
};

window.saveNewUserPlan = function(e, cc) {
    e.preventDefault();
    const newPlanId = document.getElementById('edit_u_plan').value;
    const newPlan = gymPlans.find(p => p.id === newPlanId);
    const client = state.clients.find(c => c.cc === cc);
    
    if(client && newPlan) {
        client.plan = newPlan;
        syncClientToDB(client);
        closeModal();
        renderMainContent();
    }
};
// =========================================================================
// PUNTO 1 Y 2: MODAL EDITAR USUARIO (SIN TBW, R, XC + FECHAS BLOQUEADAS PARA CLIENTE)
// =========================================================================
window.openEditProfileModal = function() {
    const isAdminViewing = state.viewingClientAsAdmin; 
    const clientData = isAdminViewing ? state.selectedClientRecord : (state.clients.find(c => c.cc === state.currentUser.cc) || state.currentUser.record);
    
    if (!clientData) return;
    const bia = clientData.bia || {};

    // Formatear la fecha de registro para el input date
    let regDateInput = '';
    if (clientData.date && clientData.date.includes('/')) {
        const parts = clientData.date.split('/');
        if (parts.length === 3) regDateInput = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else if (clientData.date && clientData.date.includes('-')) {
        regDateInput = clientData.date; 
    }

    const planDays = clientData.plan && clientData.plan.durationDays ? clientData.plan.durationDays : 30;

    // PUNTO 2: Solo el entrenador (isAdminViewing) puede editar la fecha de registro
    const regDateInputHtml = isAdminViewing 
        ? `<input type="date" id="edit_reg_date" value="${regDateInput}" onchange="updateDueDatePreview(this.value, ${planDays})" class="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-cyan-500 outline-none transition" />`
        : `<input type="date" id="edit_reg_date" value="${regDateInput}" disabled class="w-full bg-zinc-900 border border-zinc-800/60 rounded-xl p-2.5 text-sm text-zinc-500 outline-none cursor-not-allowed" />`;

    let html = `
        <div class="bg-[#050505] border border-zinc-800 rounded-[2rem] p-6 md:p-8 max-w-lg mx-auto w-full shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onclick="closeModal()" class="absolute top-4 right-4 w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition z-50">
                <i class="fa-solid fa-xmark"></i>
            </button>
            
            <h3 class="text-lg font-black text-white uppercase mb-5 tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-pen text-cyan-400"></i> Editar Datos de Usuario
            </h3>

            <div class="space-y-5">
                <!-- DATOS PERSONALES -->
                <div class="border-b border-zinc-800/80 pb-5">
                    <p class="text-[11px] font-black text-cyan-400 mb-3 uppercase tracking-widest">Datos Generales</p>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Nombre Completo</label>
                            <input type="text" id="edit_name" value="${clientData.name || ''}" class="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-cyan-500 outline-none transition" />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Edad</label>
                                <input type="number" id="edit_age" value="${clientData.age || ''}" class="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-cyan-500 outline-none transition" />
                            </div>
                            <div>
                                <label class="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Sexo</label>
                                <select id="edit_gender" class="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-cyan-500 outline-none transition">
                                    <option value="M" ${clientData.gender === 'M' ? 'selected' : ''}>Masc.</option>
                                    <option value="F" ${clientData.gender === 'F' ? 'selected' : ''}>Fem.</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Fecha de Registro</label>
                                ${regDateInputHtml}
                            </div>
                            <div>
                                <label class="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Vencimiento</label>
                                <input type="date" id="edit_due" value="${clientData.dueDate || ''}" disabled class="w-full bg-zinc-900 border border-zinc-800/60 rounded-xl p-2.5 text-sm text-zinc-500 outline-none cursor-not-allowed" />
                            </div>
                        </div>
                    </div>

                    <!-- PUNTO 1: PARÁMETROS BIA (SOLO PESO, ESTATURA, GRASA Y MÚSCULO) -->
                    <div>
                        <p class="text-[11px] font-black text-yellow-400 mb-3 uppercase tracking-widest">Parámetros BIA</p>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Peso (kg)</label>
                                <input type="number" step="0.1" id="edit_bia_weight" value="${bia.weight || ''}" class="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-400 outline-none transition" />
                            </div>
                            <div>
                                <label class="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Estatura (cm)</label>
                                <input type="number" id="edit_bia_height" value="${bia.height || ''}" class="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-400 outline-none transition" />
                            </div>
                            <div>
                                <label class="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">% Grasa</label>
                                <input type="number" step="0.1" id="edit_bia_fat" value="${bia.fat || ''}" class="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-400 outline-none transition" />
                            </div>
                            <div>
                                <label class="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Músculo (kg)</label>
                                <input type="number" step="0.1" id="edit_bia_muscle" value="${bia.muscle || ''}" class="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-400 outline-none transition" />
                            </div>
                        </div>
                    </div>

                    <button onclick="saveEditedProfile()" class="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-widest py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2">
                        <i class="fa-solid fa-save"></i> Guardar Cambios
                    </button>
                </div>
            </div>
        `;
    openModal(html);
};

window.updateDueDatePreview = function(regDateStr, durationDays) {
    if (!regDateStr) return;
    const [y, m, d] = regDateStr.split('-');
    const dateObj = new Date(y, parseInt(m) - 1, d);
    dateObj.setDate(dateObj.getDate() + durationDays);
    const dueY = dateObj.getFullYear();
    const dueM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dueD = String(dateObj.getDate()).padStart(2, '0');
    document.getElementById('edit_due').value = `${dueY}-${dueM}-${dueD}`;
};

window.saveEditedProfile = function() {
    const isAdminViewing = state.viewingClientAsAdmin; 
    let clientData = isAdminViewing ? state.selectedClientRecord : (state.clients.find(c => c.cc === state.currentUser.cc) || state.currentUser.record);
    
    clientData.name = document.getElementById('edit_name').value.trim();
    clientData.age = document.getElementById('edit_age').value;
    clientData.gender = document.getElementById('edit_gender').value;
    
    if (isAdminViewing) {
        const regDateStr = document.getElementById('edit_reg_date').value;
        if (regDateStr) {
            const [y, m, d] = regDateStr.split('-');
            clientData.date = `${d}/${m}/${y}`;
        }
        clientData.dueDate = document.getElementById('edit_due').value;
    }

    clientData.bia = clientData.bia || {};
    clientData.bia.weight = parseFloat(document.getElementById('edit_bia_weight').value);
    clientData.bia.height = parseFloat(document.getElementById('edit_bia_height').value);
    clientData.bia.fat = parseFloat(document.getElementById('edit_bia_fat').value);
    clientData.bia.muscle = parseFloat(document.getElementById('edit_bia_muscle').value);
    
    if (clientData.bia.weight && clientData.bia.height) {
        clientData.bia.bmi = (clientData.bia.weight / Math.pow(clientData.bia.height / 100, 2)).toFixed(1);
    }

    if (typeof syncClientToDB === 'function') {
        syncClientToDB(clientData);
    }
    
    closeModal(); 
    if (typeof renderMainContent === 'function') {
        renderMainContent();
    }
};

// ==========================================
// FUNCIÓN PARA ACTUALIZAR VENCIMIENTO EN TIEMPO REAL
// ==========================================
window.updateDueDatePreview = function(regDateStr, durationDays) {
    if (!regDateStr) return;
    const [y, m, d] = regDateStr.split('-');
    
    // Sumar los días a la fecha seleccionada
    const dateObj = new Date(y, parseInt(m) - 1, d);
    dateObj.setDate(dateObj.getDate() + durationDays);
    
    // Construir la nueva fecha YYYY-MM-DD
    const dueY = dateObj.getFullYear();
    const dueM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dueD = String(dateObj.getDate()).padStart(2, '0');
    
    // Actualizar la vista previa deshabilitada
    document.getElementById('edit_due').value = `${dueY}-${dueM}-${dueD}`;
};

// ==========================================
// FUNCIÓN PARA GUARDAR LOS CAMBIOS DEL LÁPIZ
// ==========================================
window.saveEditedProfile = function() {
    const isAdminViewing = state.viewingClientAsAdmin; 
    let clientData = isAdminViewing ? state.selectedClientRecord : (state.clients.find(c => c.cc === state.currentUser.cc) || state.currentUser.record);
    
    // Guardar Datos Personales
    clientData.name = document.getElementById('edit_name').value.trim();
    clientData.age = document.getElementById('edit_age').value;
    clientData.gender = document.getElementById('edit_gender').value;
    
    // Guardar Fechas (Registro y Vencimiento)
    const regDateStr = document.getElementById('edit_reg_date').value;
    if (regDateStr) {
        const [y, m, d] = regDateStr.split('-');
        clientData.date = `${d}/${m}/${y}`; // Guarda el inicio en formato DD/MM/YYYY
    }
    clientData.dueDate = document.getElementById('edit_due').value; // El input desactivado mantiene la fecha automática

    // Guardar Parámetros BIA
    clientData.bia = clientData.bia || {};
    clientData.bia.weight = parseFloat(document.getElementById('edit_bia_weight').value);
    clientData.bia.height = parseFloat(document.getElementById('edit_bia_height').value);
    clientData.bia.fat = parseFloat(document.getElementById('edit_bia_fat').value);
    clientData.bia.muscle = parseFloat(document.getElementById('edit_bia_muscle').value);
    clientData.bia.tbw = parseFloat(document.getElementById('edit_bia_tbw').value);
    clientData.bia.r = parseFloat(document.getElementById('edit_bia_r').value);
    clientData.bia.xc = parseFloat(document.getElementById('edit_bia_xc').value);
    
    // Recalcular IMC dinámicamente si cambian el peso o la altura
    if (clientData.bia.weight && clientData.bia.height) {
        clientData.bia.bmi = (clientData.bia.weight / Math.pow(clientData.bia.height / 100, 2)).toFixed(1);
    }

    // Guarda en la base de datos de GymFinity
    if (typeof syncClientToDB === 'function') {
        syncClientToDB(clientData);
    }
    
    closeModal(); 
    
    // Recarga el panel para reflejar los cambios
    if (typeof renderMainContent === 'function') {
        renderMainContent();
    }
};

// ==========================================
// FUNCIÓN PARA GUARDAR LOS CAMBIOS DEL LÁPIZ
// ==========================================
window.saveEditedProfile = function() {
    const isAdminViewing = state.viewingClientAsAdmin; 
    let clientData = isAdminViewing ? state.selectedClientRecord : (state.clients.find(c => c.cc === state.currentUser.cc) || state.currentUser.record);
    
    // Guardar Datos Personales
    clientData.name = document.getElementById('edit_name').value.trim();
    clientData.age = document.getElementById('edit_age').value;
    clientData.gender = document.getElementById('edit_gender').value;
    clientData.dueDate = document.getElementById('edit_due').value;

    // Guardar Parámetros BIA
    clientData.bia = clientData.bia || {};
    clientData.bia.weight = parseFloat(document.getElementById('edit_bia_weight').value);
    clientData.bia.height = parseFloat(document.getElementById('edit_bia_height').value);
    clientData.bia.fat = parseFloat(document.getElementById('edit_bia_fat').value);
    clientData.bia.muscle = parseFloat(document.getElementById('edit_bia_muscle').value);
    clientData.bia.tbw = parseFloat(document.getElementById('edit_bia_tbw').value);
    clientData.bia.r = parseFloat(document.getElementById('edit_bia_r').value);
    clientData.bia.xc = parseFloat(document.getElementById('edit_bia_xc').value);
    
    // Recalcular IMC dinámicamente si cambian el peso o la altura
    if (clientData.bia.weight && clientData.bia.height) {
        clientData.bia.bmi = (clientData.bia.weight / Math.pow(clientData.bia.height / 100, 2)).toFixed(1);
    }

    // Guarda en la base de datos de GymFinity
    if (typeof syncClientToDB === 'function') {
        syncClientToDB(clientData);
    }
    
    closeModal(); 
    
    // Recarga el panel para reflejar los cambios
    if (typeof renderMainContent === 'function') {
        renderMainContent();
    }
};
// ==========================================
// CONTROLADOR DE CARPETAS DE EJERCICIOS (ADMIN)
// ==========================================
window.openMuscleFolder = function(muscleGroup, colorHex) {
    const exercisesInGroup = Object.keys(exerciseDetails).filter(name => {
        const exData = exerciseDetails[name];
        if (exData.folder) return exData.folder.toUpperCase() === muscleGroup.toUpperCase();
        return exData.img.toUpperCase().includes(`/${muscleGroup}/`);
    });

    let html = `
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md" style="color: ${colorHex};">
                <i class="fa-solid fa-folder-open"></i> ${muscleGroup}
            </h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        
        <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
    `;

    if (exercisesInGroup.length === 0) {
        html += `<div class="p-8 text-center text-zinc-500 font-medium">No hay ejercicios registrados en esta categoría.</div>`;
    } else {
        exercisesInGroup.forEach(exName => {
            const exData = exerciseDetails[exName];
            const safeName = exName.replace(/'/g, "\\'");
            const safeImg = exData.img.replace(/'/g, "\\'");
            const safeDesc = exData.desc.replace(/'/g, "\\'");

            html += `
            <div class="bg-[#050505] border border-zinc-800/80 rounded-xl p-3 flex items-center gap-4 hover:border-zinc-500 transition-colors group relative overflow-hidden" style="border-left-color: ${colorHex}; border-left-width: 4px;">
                
                <!-- Contenedor clickeable para ver detalles -->
                <div onclick="viewExerciseDetails('${safeName}', '${safeImg}', '${safeDesc}', '${colorHex}')" class="flex-1 flex items-center gap-4 cursor-pointer">
                    <div class="w-16 h-16 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center border border-zinc-200 shadow-inner group-hover:scale-105 transition-transform">
                        <img src="${exData.img}" class="w-full h-full object-contain mix-blend-multiply" onerror="gymImgFix(this)" />
                    </div>
                    <div class="flex-1 flex flex-col justify-center">
                        <span class="text-sm font-bold text-white uppercase drop-shadow-md group-hover:text-zinc-200 transition">${exName}</span>
                    </div>
                </div>
                
                <!-- Botón Basura -->
                <button onclick="deleteCustomExercise('${safeName}', '${muscleGroup}', '${colorHex}')" class="w-10 h-10 flex shrink-0 items-center justify-center bg-red-900/30 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition shadow-md z-10" title="Eliminar de base de datos">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            `;
        });
    }

    html += `</div>`;
    openModal(html);
};

window.deleteCustomExercise = function(exName, muscleGroup, colorHex) {
    if(confirm(`¿Estás seguro de que deseas eliminar permanentemente el ejercicio "${exName}" de la base de datos?`)) {
        // Eliminar del objeto en memoria
        delete exerciseDetails[exName];
        
        // Eliminar del almacenamiento local (si es un ejercicio creado por el usuario)
        let customEx = JSON.parse(localStorage.getItem('gymFinityCustomEx')) || {};
        if (customEx[exName]) {
            delete customEx[exName];
            localStorage.setItem('gymFinityCustomEx', JSON.stringify(customEx));
        }
        
        // Refrescar la carpeta abierta
        openMuscleFolder(muscleGroup, colorHex);
    }
};
window.viewExerciseDetails = function(name, img, desc, colorHex) {
    const fallbackBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    
    // Crear un ID seguro sin espacios para los elementos HTML
    const safeId = name.replace(/[^a-zA-Z0-9]/g, '');
    const safeName = name.replace(/'/g, "\\'");
    
    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 md:p-10 max-w-md mx-auto w-full animate-scale-up" style="border-color: ${colorHex};">
            
            <button onclick="closeModal()" class="absolute top-5 right-5 w-9 h-9 bg-[#0a0a0a]/80 backdrop-blur-sm border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all z-50 shadow-md">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>

            <div class="flex flex-col items-center gap-5 mt-2 text-center">
                
                <!-- IMAGEN -->
                <div class="w-full bg-white rounded-2xl p-4 flex justify-center items-center border-2 shadow-[0_0_20px_rgba(255,255,255,0.05)]" style="border-color: ${colorHex};">
                    <img src="${img}" class="w-full max-h-48 object-contain mix-blend-multiply" onerror="gymImgFix(this)" />
                </div>
                
                <h3 class="text-xl md:text-2xl font-black text-white uppercase tracking-wider drop-shadow-md mt-2" style="color: ${colorHex};">${name}</h3>
                
                <!-- CAJA DE TÉCNICA Y EDICIÓN -->
                <div class="mt-4 text-left w-full bg-zinc-900/50 p-5 rounded-xl border border-zinc-800/80 relative group">
                    
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <i class="fa-solid fa-circle-info" style="color: ${colorHex};"></i> Técnica del Ejercicio
                        </h4>
                        <!-- BOTÓN LÁPIZ -->
                        <button onclick="enableTechniqueEdit('${safeId}')" class="text-zinc-500 hover:text-yellow-400 hover:scale-110 transition bg-[#0a0a0a] border border-zinc-700 w-7 h-7 rounded-full flex items-center justify-center shadow-md" title="Editar Técnica">
                            <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                    </div>
                    
                    <!-- VISTA DE TEXTO NORMAL -->
                    <p id="tech-text-${safeId}" class="text-sm text-zinc-300 leading-relaxed font-medium">${desc}</p>
                    
                    <!-- FORMULARIO DE EDICIÓN OCULTO -->
                    <div id="tech-edit-form-${safeId}" class="hidden flex-col gap-3 mt-2">
                        <textarea id="tech-input-${safeId}" rows="4" class="w-full bg-[#030303] border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-yellow-400 outline-none transition custom-scrollbar">${desc}</textarea>
                        
                        <div class="flex gap-2">
                            <button onclick="cancelTechniqueEdit('${safeId}')" class="flex-1 bg-[#0a0a0a] text-zinc-400 border border-zinc-700 py-2 rounded-lg text-xs font-bold hover:text-white transition">
                                Cancelar
                            </button>
                            <button onclick="saveGlobalTechnique('${safeName}', '${safeId}')" class="flex-1 bg-yellow-400 text-black font-extrabold py-2 rounded-lg text-xs uppercase tracking-widest shadow-[0_0_10px_rgba(255,215,0,0.3)] hover:scale-105 transition">
                                Guardar
                            </button>
                        </div>
                    </div>

                </div>
                
                <button onclick="closeModal()" class="w-full mt-6 text-black font-black uppercase tracking-widest py-3.5 rounded-xl transition shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105" style="background-color: ${colorHex};">
                    Cerrar Detalles
                </button>
            </div>
        </div>
    `;
    
    openModal(html);
};
window.enableTechniqueEdit = function(safeId) {
    document.getElementById(`tech-text-${safeId}`).classList.add('hidden');
    document.getElementById(`tech-edit-form-${safeId}`).classList.remove('hidden');
    document.getElementById(`tech-edit-form-${safeId}`).classList.add('flex');
};

window.cancelTechniqueEdit = function(safeId) {
    document.getElementById(`tech-text-${safeId}`).classList.remove('hidden');
    document.getElementById(`tech-edit-form-${safeId}`).classList.add('hidden');
    document.getElementById(`tech-edit-form-${safeId}`).classList.remove('flex');
};

window.saveGlobalTechnique = function(name, safeId) {
    const newDesc = document.getElementById(`tech-input-${safeId}`).value.trim();
    
    // 1. Actualizar el diccionario global en memoria
    if (exerciseDetails[name]) {
        exerciseDetails[name].desc = newDesc;
    }
    
    // 2. Actualizar la interfaz del modal actual
    document.getElementById(`tech-text-${safeId}`).innerText = newDesc;
    cancelTechniqueEdit(safeId);
    
    // 3. ACTUALIZACIÓN MASIVA: Buscar en todas las rutinas de los usuarios y actualizar
    let usersUpdated = 0;
    state.clients.forEach(client => {
        let hasChanges = false;
        
        if (client.workout) {
            client.workout.forEach(day => {
                day.exercises.forEach(ex => {
                    // Si el ejercicio coincide con el que acabamos de editar, le cambiamos la descripción
                    if (ex.name === name) {
                        ex.desc = newDesc;
                        hasChanges = true;
                    }
                });
            });
        }
        
        // Si este usuario tenía el ejercicio, guardamos sus datos nuevos en Firebase
        if (hasChanges) {
            syncClientToDB(client);
            usersUpdated++;
        }
    });

    console.log(`Técnica actualizada exitosamente en ${usersUpdated} rutinas de usuarios.`);
};
window.openMuscleFolder = function(muscleGroup, colorHex) {
    // Filtrar los ejercicios que pertenecen a este grupo muscular
    const exercisesInGroup = Object.keys(exerciseDetails).filter(name => {
        const exData = exerciseDetails[name];
        if (exData.folder) return exData.folder.toUpperCase() === muscleGroup.toUpperCase();
        return exData.img.toUpperCase().includes(`/${muscleGroup}/`);
    });

    let html = `
        <div class="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
            <h3 class="text-xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md" style="color: ${colorHex};">
                <i class="fa-solid fa-folder-open"></i> ${muscleGroup}
            </h3>
            <button onclick="closeModal()" class="text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        
        <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
    `;

    if (exercisesInGroup.length === 0) {
        html += `<div class="p-8 text-center text-zinc-500 font-medium">No hay ejercicios registrados en esta categoría.</div>`;
    } else {
        exercisesInGroup.forEach(exName => {
            const exData = exerciseDetails[exName];
            const safeName = exName.replace(/'/g, "\\'");

            html += `
            <div class="bg-[#050505] border border-zinc-800/80 rounded-xl p-3 flex items-center gap-4 hover:border-zinc-500 transition-colors group relative overflow-hidden" style="border-left-color: ${colorHex}; border-left-width: 4px;">
                
                <!-- Área clickeable para EDITAR ejercicio -->
                <div onclick="editGlobalExerciseModal('${safeName}', '${muscleGroup}', '${colorHex}')" class="flex-1 flex items-center gap-4 cursor-pointer">
                    <div class="w-16 h-16 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center border border-zinc-200 shadow-inner group-hover:scale-105 transition-transform">
                        <img src="${exData.img}" class="w-full h-full object-contain mix-blend-multiply" onerror="gymImgFix(this)" />
                    </div>
                    <div class="flex-1 flex flex-col justify-center">
                        <span class="text-sm font-bold text-white uppercase drop-shadow-md group-hover:text-zinc-200 transition">${exName}</span>
                    </div>
                    <!-- Icono de lápiz (solo aparece al pasar el mouse) -->
                    <i class="fa-solid fa-pen text-zinc-600 group-hover:text-white transition opacity-50 group-hover:opacity-100 pr-2"></i>
                </div>
                
                <!-- Botón Basura -->
                <button onclick="deleteCustomExercise('${safeName}', '${muscleGroup}', '${colorHex}')" class="w-10 h-10 flex shrink-0 items-center justify-center bg-red-900/30 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition shadow-md z-10" title="Eliminar de base de datos">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            `;
        });
    }

    html += `</div>`;
    openModal(html);
};

// ==========================================
// MODAL PARA EDITAR EL EJERCICIO GLOBAL
// ==========================================
window.editGlobalExerciseModal = function(exName, muscleGroup, colorHex) {
    const exData = exerciseDetails[exName];
    if (!exData) return;

    const safeName = exName.replace(/'/g, "\\'");
    
    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-md mx-auto w-full animate-scale-up" style="border-color: ${colorHex};">
            <!-- Botón Volver -->
            <button onclick="openMuscleFolder('${muscleGroup}', '${colorHex}')" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition" title="Volver a la carpeta">
                <i class="fa-solid fa-arrow-left text-xl"></i>
            </button>
            
            <h3 class="text-xl font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2" style="color: ${colorHex};">
                <i class="fa-solid fa-pen"></i> Editar Ejercicio
            </h3>
            
            <form onsubmit="saveGlobalExerciseEdit(event, '${safeName}', '${muscleGroup}', '${colorHex}')" class="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                
                <!-- Vista previa de la imagen (AUMENTADA DE TAMAÑO) -->
                <div class="flex justify-center mb-4">
                    <div class="w-40 h-40 md:w-48 md:h-48 bg-white rounded-xl p-2 flex items-center justify-center border-2 shadow-inner transition-transform hover:scale-105" style="border-color: ${colorHex}50;">
                        <img src="${exData.img}" class="w-full h-full object-contain mix-blend-multiply" onerror="gymImgFix(this)" />
                    </div>
                </div>
                
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre del Ejercicio</label>
                    <input type="text" id="e_ex_name" value="${exName}" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-white outline-none transition mt-1" required>
                </div>

                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Técnica / Descripción</label>
                    <textarea id="e_ex_desc" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-white outline-none transition mt-1 h-32 resize-none custom-scrollbar" required>${exData.desc}</textarea>
                </div>
                
                <button type="submit" class="w-full text-black font-black uppercase tracking-widest py-3.5 rounded-xl transition hover:scale-105 mt-2" style="background-color: ${colorHex}; box-shadow: 0 0 15px ${colorHex}40;">
                    Guardar Cambios
                </button>
            </form>
        </div>
    `;
    openModal(html);
};

// ==========================================
// NUEVO: GUARDAR LA EDICIÓN DEL EJERCICIO
// ==========================================
window.saveGlobalExerciseEdit = function(e, oldName, muscleGroup, colorHex) {
    e.preventDefault();
    
    const newName = document.getElementById('e_ex_name').value.trim();
    const newDesc = document.getElementById('e_ex_desc').value.trim();
    
    if (!exerciseDetails[oldName]) return;

    // 1. Guardar la imagen actual y la carpeta
    const currentImg = exerciseDetails[oldName].img;
    const currentFolder = exerciseDetails[oldName].folder || muscleGroup;

    // 2. Si el nombre cambió, creamos un nuevo registro y borramos el viejo
    if (newName !== oldName) {
        exerciseDetails[newName] = {
            img: currentImg,
            desc: newDesc,
            folder: currentFolder
        };
        delete exerciseDetails[oldName];
    } else {
        // Solo actualizamos la descripción
        exerciseDetails[oldName].desc = newDesc;
    }

    // 3. Guardar en localStorage para que sobreviva a las recargas de página
    let customEx = JSON.parse(localStorage.getItem('gymFinityCustomEx')) || {};
    if (newName !== oldName && customEx[oldName]) {
        delete customEx[oldName];
    }
    customEx[newName] = exerciseDetails[newName];
    localStorage.setItem('gymFinityCustomEx', JSON.stringify(customEx));
    
    // 4. ACTUALIZACIÓN MASIVA: Si los usuarios ya tenían este ejercicio, los actualizamos
    let usersUpdated = 0;
    state.clients.forEach(client => {
        let hasChanges = false;
        if (client.workout) {
            client.workout.forEach(day => {
                day.exercises.forEach(ex => {
                    if (ex.name === oldName) {
                        ex.name = newName; // Actualizar el nombre en su rutina
                        ex.desc = newDesc; // Actualizar su explicación técnica
                        hasChanges = true;
                    }
                });
            });
        }
        if (hasChanges) {
            if(typeof syncClientToDB === 'function') syncClientToDB(client);
            usersUpdated++;
        }
    });

    if(usersUpdated > 0) console.log(`Ejercicio actualizado en las rutinas de ${usersUpdated} clientes.`);

    // 5. Regresar a la carpeta automáticamente
    openMuscleFolder(muscleGroup, colorHex);
};

// ==========================================
// ELIMINAR EJERCICIO GLOBAL
// ==========================================
window.deleteCustomExercise = function(exName, muscleGroup, colorHex) {
    if(confirm(`¿Estás seguro de que deseas eliminar permanentemente el ejercicio "${exName}" de la base de datos general?`)) {
        // Eliminar del objeto en memoria
        delete exerciseDetails[exName];
        
        // Eliminar del almacenamiento local
        let customEx = JSON.parse(localStorage.getItem('gymFinityCustomEx')) || {};
        if (customEx[exName]) {
            delete customEx[exName];
            localStorage.setItem('gymFinityCustomEx', JSON.stringify(customEx));
        }
        
        // Refrescar la vista de la carpeta
        openMuscleFolder(muscleGroup, colorHex);
    }
};
window.previewNewExerciseImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { document.getElementById('new-ex-img-b64').value = e.target.result; };
        reader.readAsDataURL(file);
    }
};

window.saveNewExercise = function() {
    const name = document.getElementById('new-ex-name').value.trim();
    const folder = document.getElementById('new-ex-folder').value.trim().toUpperCase();
    const imgBase64 = document.getElementById('new-ex-img-b64').value;
    const desc = document.getElementById('new-ex-desc').value.trim();

    if(!name || !folder || !desc || !imgBase64) { alert("Completa todos los campos y sube una imagen."); return; }

    exerciseDetails[name] = { img: imgBase64, desc: desc, folder: folder };

    let customEx = JSON.parse(localStorage.getItem('gymFinityCustomEx')) || {};
    customEx[name] = exerciseDetails[name];
    localStorage.setItem('gymFinityCustomEx', JSON.stringify(customEx));

    alert("¡Guardado en la carpeta " + folder + "!");
    closeModal();
};
// ==========================================
// LÓGICA DE LA TIENDA Y CARRUSEL 3D
// ==========================================
window.renderBrandCarousel = function() {
    const container = document.getElementById('brand-carousel-container');
    if(!container) return;

    let leftBrand = storeBrands[(activeBrandIndex - 1 + storeBrands.length) % storeBrands.length];
    let centerBrand = storeBrands[activeBrandIndex];
    let rightBrand = storeBrands[(activeBrandIndex + 1) % storeBrands.length];

    container.innerHTML = `
        <button onclick="changeBrandCarousel(-1)" class="text-cyan-500 hover:text-cyan-400 text-4xl md:text-5xl transition hover:scale-110 drop-shadow-[0_0_10px_rgba(0,229,255,0.5)] z-20 shrink-0">
            <i class="fa-solid fa-arrow-left"></i>
        </button>

        <div class="flex items-center justify-center w-full gap-2 md:gap-4 overflow-hidden perspective-1000">
            <!-- MARCA IZQUIERDA -->
            <div onclick="changeBrandCarousel(-1)" class="hidden md:flex w-1/4 h-24 bg-[#050505] border-2 border-zinc-800 items-center justify-center rounded-xl opacity-50 scale-75 cursor-pointer transition-all duration-300 hover:opacity-100 shadow-inner">
                <span class="text-zinc-500 font-bold tracking-widest">${leftBrand}</span>
            </div>

            <!-- MARCA CENTRAL (ACTIVA) -->
            <div class="w-3/4 md:w-1/2 h-32 md:h-40 bg-[#0a0a0a] border-4 border-cyan-500 flex flex-col items-center justify-center rounded-2xl scale-100 z-10 shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all duration-300 relative overflow-hidden">
                <div class="absolute inset-0 bg-cyan-500/10 blur-xl"></div>
                <span class="text-cyan-400 font-black text-3xl md:text-4xl drop-shadow-md relative z-10 tracking-widest">${centerBrand}</span>
            </div>

            <!-- MARCA DERECHA -->
            <div onclick="changeBrandCarousel(1)" class="hidden md:flex w-1/4 h-24 bg-[#050505] border-2 border-zinc-800 items-center justify-center rounded-xl opacity-50 scale-75 cursor-pointer transition-all duration-300 hover:opacity-100 shadow-inner">
                <span class="text-zinc-500 font-bold tracking-widest">${rightBrand}</span>
            </div>
        </div>

        <button onclick="changeBrandCarousel(1)" class="text-cyan-500 hover:text-cyan-400 text-4xl md:text-5xl transition hover:scale-110 drop-shadow-[0_0_10px_rgba(0,229,255,0.5)] z-20 shrink-0">
            <i class="fa-solid fa-arrow-right"></i>
        </button>
    `;
    renderTypeFilters();
    renderProductsGrid();
};

// 1. DICCIONARIO DE COLORES PARA LAS MARCAS
const brandColors = {
    "TNT": "#e51212",         // Rojo vibrante
    "VITANAS": "#00e5ff",     // Cyan / Celeste
    "PROSCIENCE": "#e6ba09",     // Dorado / Amarillo
    "MEGABOLIC": "#4608b9",    // Verde
    "MACROBLENDS": "#edf0f5",   // Blanco / Gris claro
    "BIOPRONAT": "#e91092",// Rosado / Magenta
    "ADVANCED": "#0be307", //Verde
    "NUTRAMERICAN": "#dc6007"     // Naranja
};

let brandCarouselInterval; 

window.renderBrandCarousel = function() {
    const container = document.getElementById('brand-carousel-container');
    if(!container) return;

    let leftBrand = storeBrands[(activeBrandIndex - 1 + storeBrands.length) % storeBrands.length];
    let centerBrand = storeBrands[activeBrandIndex];
    let rightBrand = storeBrands[(activeBrandIndex + 1) % storeBrands.length];

    // Obtenemos el color de la marca activa (si no existe, usa cyan por defecto)
    const activeColor = brandColors[centerBrand] || "#00e5ff";

    // 2. ANIMACIÓN SUTIL DE ENTRADA Y BRILLO REDUCIDO
    const animStyles = `
        <style>
            /* Movimiento sutil de "pop-in" al cambiar de marca */
            @keyframes subtleSwap {
                0% { opacity: 0.5; transform: scale(0.92); }
                100% { opacity: 1; transform: scale(1); }
            }
            .animate-swap {
                animation: subtleSwap 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            }
            
            /* Latido suave: Letra blanca para leer perfecto, sombra del color de la marca */
            @keyframes softPulse {
                0% { text-shadow: 0 0 2px ${activeColor}, 0 0 4px ${activeColor}80; }
                100% { text-shadow: 0 0 6px ${activeColor}, 0 0 10px ${activeColor}80; }
            }
            .text-soft-neon {
                color: #ffffff; /* Letra principal blanca para máxima legibilidad */
                animation: softPulse 2s ease-in-out infinite alternate;
            }
        </style>
    `;

    container.innerHTML = `
        ${animStyles}
        <!-- Flecha Izquierda (Toma el color de la marca) -->
        <button onclick="changeBrandCarousel(-1, true)" class="transition hover:scale-110 z-20 shrink-0" style="color: ${activeColor}; filter: drop-shadow(0 0 5px ${activeColor}60);">
            <i class="fa-solid fa-arrow-left text-4xl md:text-5xl"></i>
        </button>

        <div class="flex items-center justify-center w-full gap-2 md:gap-4 overflow-hidden perspective-1000" 
             onmouseenter="stopBrandCarousel()" 
             onmouseleave="startBrandCarousel()">
            
            <!-- MARCA IZQUIERDA -->
            <div onclick="changeBrandCarousel(-1, true)" class="hidden md:flex w-1/4 h-24 bg-[#050505] border-2 border-zinc-800 items-center justify-center rounded-xl opacity-50 scale-75 cursor-pointer transition-all duration-300 hover:opacity-100 hover:scale-90 shadow-inner translate-x-4">
                <span class="text-zinc-500 font-bold tracking-widest">${leftBrand}</span>
            </div>

            <!-- MARCA CENTRAL (COLOR DINÁMICO Y ANIMACIÓN SWAP) -->
            <div class="animate-swap w-3/4 md:w-1/2 h-32 md:h-40 bg-[#0a0a0a] border-4 flex flex-col items-center justify-center rounded-2xl z-10 transition-all relative overflow-hidden group" style="border-color: ${activeColor}; box-shadow: 0 0 25px ${activeColor}30;">
                <div class="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 blur-2xl" style="background-color: ${activeColor};"></div>
                <span class="text-soft-neon font-black text-3xl md:text-4xl relative z-10 tracking-widest">${centerBrand}</span>
            </div>

            <!-- MARCA DERECHA -->
            <div onclick="changeBrandCarousel(1, true)" class="hidden md:flex w-1/4 h-24 bg-[#050505] border-2 border-zinc-800 items-center justify-center rounded-xl opacity-50 scale-75 cursor-pointer transition-all duration-300 hover:opacity-100 hover:scale-90 shadow-inner -translate-x-4">
                <span class="text-zinc-500 font-bold tracking-widest">${rightBrand}</span>
            </div>
        </div>

        <!-- Flecha Derecha (Toma el color de la marca) -->
        <button onclick="changeBrandCarousel(1, true)" class="transition hover:scale-110 z-20 shrink-0" style="color: ${activeColor}; filter: drop-shadow(0 0 5px ${activeColor}60);">
            <i class="fa-solid fa-arrow-right text-4xl md:text-5xl"></i>
        </button>
    `;
    renderTypeFilters();
    renderProductsGrid();
    
    startBrandCarousel(); 
};

window.changeBrandCarousel = function(dir, manualClick = false) {
    activeBrandIndex = (activeBrandIndex + dir + storeBrands.length) % storeBrands.length;
    activeTypeFilter = "Todos"; 
    
    if (manualClick) stopBrandCarousel();
    renderBrandCarousel();
};

window.renderTypeFilters = function() {
    const container = document.getElementById('product-type-filters');
    if(!container) return;

    const centerBrand = storeBrands[activeBrandIndex];
    const activeColor = brandColors[centerBrand] || "#00e5ff"; // El filtro también usa el color de la marca
    const productsOfBrand = storeProducts.filter(p => p.brand === centerBrand);
    const types = ["Todos", ...new Set(productsOfBrand.map(p => p.type))]; 

    container.innerHTML = types.map(t => {
        const isActive = activeTypeFilter === t;
        if(isActive) {
            return `<button onclick="setTypeFilter('${t}')" class="px-5 py-2.5 bg-black border rounded-xl text-xs font-black uppercase tracking-widest transition-all scale-105" style="color: ${activeColor}; border-color: ${activeColor}; box-shadow: 0 0 15px ${activeColor}40;">${t}</button>`;
        } else {
            return `<button onclick="setTypeFilter('${t}')" class="px-5 py-2.5 bg-[#0a0a0a] border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border">${t}</button>`;
        }
    }).join('');
};

window.setTypeFilter = function(type) {
    activeTypeFilter = type;
    renderTypeFilters();
    renderProductsGrid();
};

window.renderProductsGrid = function() {
    const container = document.getElementById('products-grid');
    if(!container) return;

    const centerBrand = storeBrands[activeBrandIndex];
    // Extrae el color de la marca, si no hay usa cyan
    const activeColor = brandColors[centerBrand] || "#00e5ff"; 

    let filtered = storeProducts.filter(p => p.brand === centerBrand);
    
    if(activeTypeFilter !== "Todos") {
        filtered = filtered.filter(p => p.type === activeTypeFilter);
    }

    if(filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-zinc-500 py-10 font-bold uppercase tracking-widest text-sm">No hay productos disponibles en esta categoría.</div>`;
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div class="card-depth rounded-[2rem] p-6 flex flex-col transition-all duration-500 group" 
             style="background: linear-gradient(145deg, #050505 40%, ${activeColor}15 100%); border: 2px solid ${activeColor}30; box-shadow: 0 10px 30px ${activeColor}10;"
             onmouseenter="this.style.borderColor='${activeColor}'; this.style.boxShadow='0 0 30px ${activeColor}40'; this.style.transform='translateY(-5px)';"
             onmouseleave="this.style.borderColor='${activeColor}30'; this.style.boxShadow='0 10px 30px ${activeColor}10'; this.style.transform='translateY(0)';">
            
            <div class="h-48 w-full flex items-center justify-center mb-6 relative">
                <!-- Resplandor detrás del tarro con el color de la marca -->
                <div class="absolute inset-0 blur-3xl rounded-full opacity-20 group-hover:opacity-50 transition-opacity duration-500" style="background-color: ${activeColor};"></div>
                <img src="${p.img}" alt="${p.name}" class="h-full object-contain relative z-10 group-hover:scale-110 transition duration-500 drop-shadow-2xl" onerror="this.src='PRODUCTOS/DEFAULT.png'">
            </div>
            
            <div class="w-full text-left flex-1 flex flex-col">
                <!-- Etiqueta del tipo de producto -->
                <span class="text-[10px] font-black uppercase tracking-widest transition-all duration-300" style="color: ${activeColor}; filter: drop-shadow(0 0 5px ${activeColor}80);">${p.type}</span>
                
                <h4 class="text-xl md:text-2xl font-black text-white mt-1 leading-tight drop-shadow-md">${p.name}</h4>
                <p class="text-xs text-zinc-400 mt-2 font-medium leading-relaxed">${p.desc}</p>
                
                <div class="mt-auto pt-6 flex items-center justify-between">
                    <!-- Precio con el color de la marca -->
                    <p class="text-2xl font-black drop-shadow-md transition-colors duration-300" style="color: ${activeColor};">${p.price}</p>
                    
                    <!-- Botón de WhatsApp dinámico anclado al color de la marca -->
                    <a href="https://wa.me/573195335508?text=${encodeURIComponent(waProductMessage(p))}" target="_blank" 
                       class="w-12 h-12 flex items-center justify-center rounded-xl text-xl transition-all duration-300"
                       style="background-color: #0a0a0a; border: 1px solid ${activeColor}50; color: ${activeColor};"
                       onmouseenter="this.style.backgroundColor='${activeColor}'; this.style.color='#000'; this.style.boxShadow='0 0 15px ${activeColor}80'; this.style.borderColor='${activeColor}';"
                       onmouseleave="this.style.backgroundColor='#0a0a0a'; this.style.color='${activeColor}'; this.style.boxShadow='none'; this.style.borderColor='${activeColor}50';">
                        <i class="fa-brands fa-whatsapp"></i>
                    </a>
                </div>
            </div>
        </div>
    `).join('');
};

window.startBrandCarousel = function() {
    clearInterval(brandCarouselInterval);
    brandCarouselInterval = setInterval(() => {
        changeBrandCarousel(1, false);
    }, 3500); 
};

window.stopBrandCarousel = function() {
    clearInterval(brandCarouselInterval); 
};
window.changeBrandCarousel = function(dir, manualClick = false) {
    activeBrandIndex = (activeBrandIndex + dir + storeBrands.length) % storeBrands.length;
    activeTypeFilter = "Todos"; 
    
    // Si el usuario hace clic, frenamos el temporizador temporalmente para no saltar dos veces rápido
    if (manualClick) {
        stopBrandCarousel();
    }
    
    renderBrandCarousel();
};

// ==========================================
// FUNCIONES DE AUTO-PLAY (NUEVO)
// ==========================================
let carouselInterval;

window.startBrandCarousel = function() {
    // Función vaciada para eliminar el auto-scroll de 3 segundos
    clearInterval(carouselInterval);
};

window.stopBrandCarousel = function() {
    clearInterval(carouselInterval);
};
window.renderTypeFilters = function() {
    const container = document.getElementById('product-type-filters');
    if(!container) return;

    const centerBrand = storeBrands[activeBrandIndex];
    const productsOfBrand = storeProducts.filter(p => p.brand === centerBrand);
    const types = ["Todos", ...new Set(productsOfBrand.map(p => p.type))]; // Saca los tipos de producto dinámicamente

    container.innerHTML = types.map(t => `
        <button onclick="setTypeFilter('${t}')" class="px-5 py-2.5 ${activeTypeFilter === t ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.5)] border-cyan-400' : 'bg-[#0a0a0a] border-zinc-800 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/50'} border rounded-xl text-xs font-black uppercase tracking-widest transition-all">
            ${t}
        </button>
    `).join('');
};

window.setTypeFilter = function(type) {
    activeTypeFilter = type;
    renderTypeFilters();
    renderProductsGrid();
};

// Reduce el tamaño del nombre de la marca hasta que quepa completo en su tarjeta
window.fitBrandName = function() {
    const fit = () => {
        const el = document.getElementById('brand-name-fit');
        if (!el || !el.parentElement) return;
        const avail = el.parentElement.clientWidth - 24;
        let size = parseFloat(getComputedStyle(el).fontSize);
        let guard = 30;
        while (el.scrollWidth > avail && size > 10 && guard-- > 0) {
            size -= 1;
            el.style.fontSize = size + 'px';
        }
    };
    requestAnimationFrame(fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
};

// Mensaje de WhatsApp: "Hola, me interesa el producto: Marca - Producto"
window.waProductMessage = function(p) {
    const brand = String(p.brand || '').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
    return `Hola, me interesa el producto: ${brand} - ${p.name}`;
};

window.renderBrandCarousel = function() {
    const container = document.getElementById('brand-carousel-container');
    if(!container) return;

    let leftBrand = storeBrands[(activeBrandIndex - 1 + storeBrands.length) % storeBrands.length];
    let centerBrand = storeBrands[activeBrandIndex];
    let rightBrand = storeBrands[(activeBrandIndex + 1) % storeBrands.length];

    // Obtenemos el color de la marca activa (si no existe, usa cyan por defecto)
    const activeColor = brandColors[centerBrand] || "#00e5ff";

    const animStyles = `
        <style>
            @keyframes subtleSwap {
                0% { opacity: 0.5; transform: scale(0.92); }
                100% { opacity: 1; transform: scale(1); }
            }
            .animate-swap {
                animation: subtleSwap 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            }
            @keyframes softPulse {
                0% { text-shadow: 0 0 2px ${activeColor}, 0 0 4px ${activeColor}80; }
                100% { text-shadow: 0 0 6px ${activeColor}, 0 0 10px ${activeColor}80; }
            }
            .text-soft-neon {
                color: #ffffff; 
                animation: softPulse 2s ease-in-out infinite alternate;
            }
            /* Animación exclusiva para hacer que las flechas brillen como neón real */
            @keyframes neonGlow {
                0% { filter: drop-shadow(0 0 2px ${activeColor}) drop-shadow(0 0 5px ${activeColor}) drop-shadow(0 0 12px ${activeColor}80); }
                100% { filter: drop-shadow(0 0 3px ${activeColor}) drop-shadow(0 0 8px ${activeColor}) drop-shadow(0 0 20px ${activeColor}); }
            }
            .neon-arrow {
                animation: neonGlow 1.5s ease-in-out infinite alternate;
            }
        </style>
    `;

    container.innerHTML = `
        ${animStyles}
        
        <!-- Flecha Izquierda (Punta hueca encajando con Diamante, copia 100% exacta) -->
        <button onclick="changeBrandCarousel(-1, true)" class="transition-transform hover:scale-110 z-20 shrink-0 group neon-arrow" style="color: ${activeColor};">
            <svg viewBox="0 0 50 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="w-8 h-8 md:w-16 md:h-16">
                <!-- Punta de flecha izquierda -->
                <polygon points="26,3 4,15 26,27 20,15" />
                <!-- Diamante derecho -->
                <polygon points="46,15 36,9 26,15 36,21" />
            </svg>
        </button>

        <div class="flex items-center justify-center w-full min-w-0 gap-2 md:gap-4 overflow-hidden perspective-1000" 
             onmouseenter="stopBrandCarousel()" 
             onmouseleave="startBrandCarousel()">
            
            <!-- MARCA IZQUIERDA -->
            <div onclick="changeBrandCarousel(-1, true)" class="hidden md:flex w-1/4 h-24 bg-[#050505] border-2 border-zinc-800 items-center justify-center rounded-xl opacity-50 scale-75 cursor-pointer transition-all duration-300 hover:opacity-100 hover:scale-90 shadow-inner translate-x-4">
                <span class="text-zinc-500 font-bold tracking-widest">${leftBrand}</span>
            </div>

            <!-- MARCA CENTRAL -->
            <div class="animate-swap w-full md:w-1/2 min-w-0 h-28 md:h-40 bg-[#0a0a0a] border-4 flex flex-col items-center justify-center rounded-2xl z-10 transition-all relative overflow-hidden group px-2" style="border-color: ${activeColor}; box-shadow: 0 0 25px ${activeColor}30;">
                <div class="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 blur-2xl" style="background-color: ${activeColor};"></div>
                <span id="brand-name-fit" class="text-soft-neon font-black relative z-10 text-center" style="font-size: clamp(1.1rem, 6vw, 2.25rem); letter-spacing: 0.06em; max-width: 100%; white-space: nowrap;">${centerBrand}</span>
            </div>

            <!-- MARCA DERECHA -->
            <div onclick="changeBrandCarousel(1, true)" class="hidden md:flex w-1/4 h-24 bg-[#050505] border-2 border-zinc-800 items-center justify-center rounded-xl opacity-50 scale-75 cursor-pointer transition-all duration-300 hover:opacity-100 hover:scale-90 shadow-inner -translate-x-4">
                <span class="text-zinc-500 font-bold tracking-widest">${rightBrand}</span>
            </div>
        </div>

        <!-- Flecha Derecha (Diamante encajando con Punta hueca, copia 100% exacta) -->
        <button onclick="changeBrandCarousel(1, true)" class="transition-transform hover:scale-110 z-20 shrink-0 group neon-arrow" style="color: ${activeColor};">
            <svg viewBox="0 0 50 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="w-8 h-8 md:w-16 md:h-16">
                <!-- Diamante izquierdo -->
                <polygon points="4,15 14,9 24,15 14,21" />
                <!-- Punta de flecha derecha -->
                <polygon points="24,3 46,15 24,27 30,15" />
            </svg>
        </button>
    `;
    fitBrandName();
    renderTypeFilters();
    renderProductsGrid();
    
    startBrandCarousel(); 
};

// Asegurar que el carrusel se inicialice cada vez que se recarga la página principal
const originalRenderMainContent = window.renderMainContent;
window.renderMainContent = function() {
    originalRenderMainContent();
    if (!state.currentUser) { // Si estamos en la Landing Page
        setTimeout(renderBrandCarousel, 100);
    }
};
// =========================================================================
// LÓGICA DE CARPETAS DE EJERCICIOS DINÁMICAS
// =========================================================================
let defaultMuscleFolders = [
    { name: 'Abdomen', id: 'ABDOMEN', color: '#00e5ff' },
    { name: 'Aductores', id: 'ADUCTORES', color: '#ffd700' },
    { name: 'Antebrazo', id: 'ANTEBRAZO', color: '#8b5cf6' },
    { name: 'Bíceps', id: 'BICEPS', color: '#ef4444' },
    { name: 'Cardio', id: 'CARDIO', color: '#10b981' },
    { name: 'Cuádriceps', id: 'CUADRICEPS', color: '#f97316' },
    { name: 'Espalda', id: 'ESPALDA', color: '#3b82f6' },
    { name: 'Gemelos', id: 'GEMELOS', color: '#ec4899' },
    { name: 'Glúteo', id: 'GLUTEO', color: '#ffffff' },
    { name: 'Hombro', id: 'HOMBRO', color: '#52525b' },
    { name: 'Isquios', id: 'ISQUIOS', color: '#d946ef' },
    { name: 'Pecho', id: 'PECHO', color: '#14b8a6' },
    { name: 'Tibia', id: 'TIBIA', color: '#84cc16' },
    { name: 'Tríceps', id: 'TRICEPS', color: '#f43f5e' }
];

function getMuscleFolders() {
    const customFolders = JSON.parse(localStorage.getItem('gymFinityCustomFolders')) || [];
    return [...defaultMuscleFolders, ...customFolders];
}

window.renderAdminInventory = function() {
    const folders = getMuscleFolders();
    return `
    <div class="card-depth border border-zinc-800 rounded-[2rem] p-8 max-w-6xl mx-auto space-y-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-zinc-800/80 pb-4">
            <h3 class="text-xl font-bold text-white flex items-center gap-3 drop-shadow-md">
                <span class="p-2.5 bg-zinc-800 rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.1)]"><i class="fa-solid fa-folder-open text-zinc-300"></i></span> 
                Base de Datos de Ejercicios
            </h3>
            <div class="flex gap-2">
                <button onclick="openAddMuscleFolderModal()" class="bg-[#0a0a0a] border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-black px-4 py-3 rounded-xl text-xs transition hover:scale-105 flex items-center gap-2">
                    <i class="fa-solid fa-folder-plus"></i> Nueva Carpeta
                </button>
                <button onclick="openAddExerciseModal()" class="bg-cyan-500 hover:bg-cyan-400 text-black font-black px-5 py-3 rounded-xl text-sm shadow-[0_0_15px_rgba(0,229,255,0.4)] transition hover:scale-105 flex items-center gap-2">
                    <i class="fa-solid fa-plus"></i> Añadir Ejercicio
                </button>   
            </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            ${folders.map(f => {
                let shadowColor = 'rgba(255,255,255,0.4)';
                if (f.color !== '#52525b' && f.color !== '#ffffff') {
                    const hex = f.color.replace('#', '');
                    if(hex.length === 6) {
                        shadowColor = 'rgba(' + parseInt(hex.slice(0,2),16) + ',' + parseInt(hex.slice(2,4),16) + ',' + parseInt(hex.slice(4,6),16) + ',0.4)';
                    }
                } else if (f.color === '#52525b') {
                    shadowColor = 'rgba(255,255,255,0.2)';
                }
                return `
                <div onclick="openMuscleFolder('${f.id}', '${f.color === '#52525b' ? '#a1a1aa' : f.color}')" class="bg-[#050505] rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:scale-105 hover:-translate-y-2 transition-all duration-300 group" style="border: 1px solid ${f.color}66;" onmouseover="this.style.boxShadow='0 0 20px ${shadowColor}'" onmouseout="this.style.boxShadow='none'">
                    <i class="fa-solid fa-folder-open text-3xl group-hover:animate-bounce" style="color: ${f.color}; filter: drop-shadow(0 0 10px ${f.color === '#52525b' ? '#ffffff40' : f.color + 'CC'});"></i>
                    <span class="text-white font-black text-xs md:text-sm tracking-wider uppercase">${f.name}</span>
                </div>
                `;
            }).join('')}
        </div>
    </div>
    `;
};

window.openAddMuscleFolderModal = function() {
    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-sm mx-auto w-full animate-scale-up border-cyan-500/50">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
            <h3 class="text-xl font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2"><i class="fa-solid fa-folder-plus text-cyan-400"></i> Nueva Carpeta</h3>
            <div class="space-y-4">
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre de la Carpeta</label>
                    <input type="text" id="n_m_folder_name" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white outline-none transition mt-1 uppercase" placeholder="Ej. LUMBARES">
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Color Hexadecimal (Para la tarjeta)</label>
                    <input type="color" id="n_m_folder_color" class="w-full h-12 bg-[#0a0a0a] border border-zinc-800 rounded-xl cursor-pointer mt-1" value="#00e5ff">
                </div>
                <button onclick="saveNewMuscleFolder()" class="w-full bg-cyan-500 text-black font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-cyan-400 transition hover:scale-105 mt-4 shadow-[0_0_15px_rgba(0,229,255,0.3)]">Crear Carpeta</button>
            </div>
        </div>
    `;
    openModal(html);
};

window.saveNewMuscleFolder = function() {
    const folderName = document.getElementById('n_m_folder_name').value.trim().toUpperCase();
    const colorHex = document.getElementById('n_m_folder_color').value;

    if(!folderName) { alert("Ingresa un nombre para la carpeta."); return; }
    
    const allFolders = getMuscleFolders();
    if(allFolders.find(f => f.id === folderName)) {
        alert("Esta carpeta ya existe."); return;
    }

    let customFolders = JSON.parse(localStorage.getItem('gymFinityCustomFolders')) || [];
    customFolders.push({ name: folderName, id: folderName, color: colorHex });
    localStorage.setItem('gymFinityCustomFolders', JSON.stringify(customFolders));

    if (typeof musculos !== 'undefined' && !musculos.includes(folderName)) {
        musculos.push(folderName);
    }

    alert(`Carpeta ${folderName} creada exitosamente.`);
    closeModal();
    if (typeof renderMainContent === 'function') renderMainContent(); 
};

window.openAddExerciseModal = function() {
    const folders = getMuscleFolders();
    const optionsHTML = folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');

    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-md mx-auto w-full animate-scale-up" style="border-color: #00e5ff;">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
            <h3 class="text-xl font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2"><i class="fa-solid fa-dumbbell text-cyan-400"></i> Nuevo Ejercicio</h3>
            <div class="space-y-4">
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sube Imagen del Ejercicio</label>
                    <input type="file" accept="image/*" onchange="previewNewExerciseImage(event)" class="w-full mt-1 text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-zinc-800 file:text-cyan-400 hover:file:bg-zinc-700 transition cursor-pointer">
                    <input type="hidden" id="new-ex-img-b64">
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre del Ejercicio</label>
                    <input type="text" id="new-ex-name" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition mt-1" placeholder="Ej. Press Militar">
                </div>
                <div class="mb-4">
                    <label class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Carpeta / Grupo Muscular</label>
                    <select id="new-ex-folder" class="w-full bg-[#0a0a0a] border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition appearance-none cursor-pointer">
                        <option value="" disabled selected>Selecciona una carpeta...</option>
                        ${optionsHTML}
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Explicación de la técnica</label>
                    <textarea id="new-ex-desc" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition mt-1 h-20 resize-none custom-scrollbar" placeholder="Técnica..."></textarea>
                </div>
                <button onclick="saveNewExercise()" class="w-full bg-cyan-500 text-black font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-cyan-400 transition hover:scale-105 mt-2 shadow-[0_0_15px_rgba(0,229,255,0.3)]">Guardar Ejercicio</button>
            </div>
        </div>
    `;
    openModal(html);
};

window.saveNewMuscleFolder = function() {
    const folderName = document.getElementById('n_m_folder_name').value.trim().toUpperCase();
    const colorHex = document.getElementById('n_m_folder_color').value;

    if(!folderName) { alert("Ingresa un nombre para la carpeta."); return; }
    
    const allFolders = getMuscleFolders();
    if(allFolders.find(f => f.id === folderName)) {
        alert("Esta carpeta ya existe."); return;
    }

    let customFolders = JSON.parse(localStorage.getItem('gymFinityCustomFolders')) || [];
    customFolders.push({ name: folderName, id: folderName, color: colorHex });
    localStorage.setItem('gymFinityCustomFolders', JSON.stringify(customFolders));

    if (typeof musculos !== 'undefined' && !musculos.includes(folderName)) {
        musculos.push(folderName);
    }

    alert(`Carpeta ${folderName} creada exitosamente.`);
    closeModal();
    if (typeof renderMainContent === 'function') renderMainContent(); 
};

window.openAddExerciseModal = function() {
    const folders = getMuscleFolders();
    const optionsHTML = folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');

    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-md mx-auto w-full animate-scale-up" style="border-color: #00e5ff;">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
            <h3 class="text-xl font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2"><i class="fa-solid fa-dumbbell text-cyan-400"></i> Nuevo Ejercicio</h3>
            <div class="space-y-4">
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sube Imagen del Ejercicio</label>
                    <input type="file" accept="image/*" onchange="previewNewExerciseImage(event)" class="w-full mt-1 text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-zinc-800 file:text-cyan-400 hover:file:bg-zinc-700 transition cursor-pointer">
                    <input type="hidden" id="new-ex-img-b64">
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre del Ejercicio</label>
                    <input type="text" id="new-ex-name" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition mt-1" placeholder="Ej. Press Militar">
                </div>
                <div class="mb-4">
                    <label class="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Carpeta / Grupo Muscular</label>
                    <select id="new-ex-folder" class="w-full bg-[#0a0a0a] border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition appearance-none cursor-pointer">
                        <option value="" disabled selected>Selecciona una carpeta...</option>
                        ${optionsHTML}
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Explicación de la técnica</label>
                    <textarea id="new-ex-desc" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition mt-1 h-20 resize-none custom-scrollbar" placeholder="Técnica..."></textarea>
                </div>
                <button onclick="saveNewExercise()" class="w-full bg-cyan-500 text-black font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-cyan-400 transition hover:scale-105 mt-2 shadow-[0_0_15px_rgba(0,229,255,0.3)]">Guardar Ejercicio</button>
            </div>
        </div>
    `;
    openModal(html);
};

// -------------------------------------------------------------------------
// B. LÓGICA DE CARPETAS DE PRODUCTOS (MARCAS)
// -------------------------------------------------------------------------
// =========================================================================
// LÓGICA DE CARPETAS DE PRODUCTOS (MARCAS DINÁMICAS)
// =========================================================================
const customBrands = JSON.parse(localStorage.getItem('gymFinityCustomBrands')) || [];
customBrands.forEach(b => {
    if (typeof storeBrands !== 'undefined' && !storeBrands.includes(b.name)) {
        storeBrands.push(b.name);
    }
    if (typeof brandColors !== 'undefined') {
        brandColors[b.name] = b.color;
    }
});

window.openAddBrandModal = function() {
    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-sm mx-auto w-full animate-scale-up border-zinc-600">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
            <h3 class="text-xl font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2"><i class="fa-solid fa-folder-plus text-zinc-400"></i> Nueva Marca / Carpeta</h3>
            <div class="space-y-4">
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre de la Marca</label>
                    <input type="text" id="n_b_name" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white outline-none transition mt-1 uppercase" placeholder="Ej. OPTIMUM NUTRITION">
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Color Hexadecimal (Para la tarjeta)</label>
                    <input type="color" id="n_b_color" class="w-full h-12 bg-[#0a0a0a] border border-zinc-800 rounded-xl cursor-pointer mt-1" value="#ffffff">
                </div>
                
                <button onclick="saveNewBrand()" class="w-full bg-zinc-200 text-black font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-white transition hover:scale-105 mt-4">Crear Carpeta</button>
            </div>
        </div>
    `;
    openModal(html);
};

window.saveNewBrand = function() {
    const brandName = document.getElementById('n_b_name').value.trim().toUpperCase();
    const colorHex = document.getElementById('n_b_color').value;

    if(!brandName) { alert("Ingresa un nombre para la marca."); return; }
    
    if (typeof storeBrands !== 'undefined') {
        if(storeBrands.includes(brandName)) {
            alert("Esta marca ya existe."); return;
        }
        storeBrands.push(brandName);
    }
    
    if (typeof brandColors !== 'undefined') {
        brandColors[brandName] = colorHex;
    }

    let savedBrands = JSON.parse(localStorage.getItem('gymFinityCustomBrands')) || [];
    savedBrands.push({ name: brandName, color: colorHex });
    localStorage.setItem('gymFinityCustomBrands', JSON.stringify(savedBrands));

    alert(`Marca ${brandName} creada exitosamente.`);
    closeModal();
    if (typeof renderMainContent === 'function') renderMainContent(); 
};
// =========================================================================
// MOTOR DE PLANTILLAS DE RUTINAS POR OBJETIVOS
// =========================================================================

// Variable temporal para construir la rutina en vivo
let currentTemplateBuilder = null;

window.renderAdminRoutines = function() {
    let routinesHTML = '';
    
    if (state.routineTemplates.length === 0) {
        routinesHTML = `<div class="p-10 text-center text-zinc-500 font-medium">No hay plantillas creadas. ¡Crea el primer objetivo!</div>`;
    } else {
        // Agrupar rutinas por el nombre base (antes del ' - ')
        const groupedRoutines = {};
        state.routineTemplates.forEach((tpl, idx) => {
            let baseName = tpl.objective;
            if (tpl.objective.includes(' - ')) {
                baseName = tpl.objective.split(' - ')[0].trim();
            }
            if (!groupedRoutines[baseName]) groupedRoutines[baseName] = [];
            groupedRoutines[baseName].push({ tpl, idx });
        });

        // Generar el HTML agrupado
        for (const [groupName, routines] of Object.entries(groupedRoutines)) {
            routinesHTML += `
            <div class="mb-8 last:mb-0">
                <h4 class="text-lg font-black text-purple-400 uppercase tracking-widest mb-4 border-b border-purple-500/30 pb-2 flex items-center gap-2 drop-shadow-md">
                    <i class="fa-solid fa-layer-group"></i> ${groupName}
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${routines.map(({ tpl, idx }) => `
                    <div class="bg-[#050505] border border-zinc-800/80 rounded-2xl p-5 hover:border-purple-500/50 transition-all shadow-md group relative">
                        <button onclick="deleteTemplate(${idx})" class="absolute top-3 right-3 text-red-500 hover:text-red-400 p-2 rounded-lg bg-red-900/20 opacity-0 group-hover:opacity-100 transition" title="Eliminar Rutina"><i class="fa-solid fa-trash"></i></button>
                        <div class="flex items-center gap-3 mb-3">
                            <i class="fa-solid fa-bullseye text-purple-400 text-xl"></i>
                            <h4 class="text-white font-black uppercase tracking-wider">${tpl.objective}</h4>
                        </div>
                        <p class="text-xs text-zinc-400 font-bold mb-4">Entrenamiento de <strong class="text-purple-400">${tpl.days} Días</strong></p>
                        
                        <button onclick="editTemplate(${idx})" class="w-full py-2.5 bg-[#0a0a0a] border border-zinc-700 text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-800 hover:text-white transition">
                            Ver / Editar Estructura
                        </button>
                    </div>
                    `).join('')}
                </div>
            </div>`;
        }
    }

    return `
    <div class="card-depth border border-zinc-800 rounded-[2rem] p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-zinc-800/80 pb-4">
            <h3 class="text-xl font-bold text-white flex items-center gap-3 drop-shadow-md">
                <span class="p-2.5 bg-purple-500/10 rounded-xl shadow-[0_0_10px_rgba(168,85,247,0.2)]"><i class="fa-solid fa-list-check text-purple-400"></i></span> 
                Rutinas por Objetivos
            </h3>
            <button onclick="openAddObjectiveModal()" class="bg-purple-500 hover:bg-purple-400 text-white font-black px-5 py-3 rounded-xl text-sm shadow-[0_0_15px_rgba(168,85,247,0.4)] transition hover:scale-105 flex items-center gap-2">
                <i class="fa-solid fa-plus"></i> Añadir Objetivo
            </button>   
        </div>
        
        <div class="space-y-4">
            ${routinesHTML}
        </div>
    </div>`;
};

window.openAddObjectiveModal = function() {
    openModal(`
        <div class="bg-[#050505] border border-purple-500/50 rounded-[2rem] p-6 max-w-sm mx-auto w-full shadow-2xl relative animate-scale-up">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-zinc-500 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h3 class="text-xl font-black text-white uppercase mb-5 flex items-center gap-2"><i class="fa-solid fa-plus text-purple-400"></i> Nuevo Objetivo</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre del Objetivo</label>
                    <input type="text" id="n_obj_name" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition mt-1 uppercase" placeholder="Ej. HIPERTROFIA">
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Días de Entrenamiento</label>
                    <select id="n_obj_days" class="w-full bg-[#0a0a0a] border border-zinc-800 text-white rounded-xl px-3 py-3 focus:outline-none focus:border-purple-500 transition mt-1 cursor-pointer">
                        <option value="3">3 Días</option><option value="4" selected>4 Días</option>
                        <option value="5">5 Días</option><option value="6">6 Días</option>
                    </select>
                </div>
                <button onclick="startTemplateBuilder()" class="w-full bg-purple-500 text-white font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-purple-400 transition shadow-[0_0_15px_rgba(168,85,247,0.3)] mt-2">
                    Estructurar Días <i class="fa-solid fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    `);
};

window.startTemplateBuilder = function() {
    const objName = document.getElementById('n_obj_name').value.trim().toUpperCase();
    const days = parseInt(document.getElementById('n_obj_days').value);
    
    if(!objName) return alert("Escribe el nombre del objetivo");

    currentTemplateBuilder = { objective: objName, days: days, workout: [] };
    for(let i=0; i<days; i++) {
        currentTemplateBuilder.workout.push({ day: `Día ${i+1}`, exercises: [] });
    }
    
    renderTemplateEditor();
};

window.editTemplate = function(index) {
    currentTemplateBuilder = JSON.parse(JSON.stringify(state.routineTemplates[index]));
    currentTemplateBuilder.originalIndex = index; // Para saber si estamos editando
    renderTemplateEditor();
};

// Quita palabras repetidas ("Series", "Reps") porque la etiqueta ya las indica
function tplVal(v) { return String(v == null ? '' : v).replace(/\s*(series|serie|reps|rep|repeticiones)\.?\s*$/i, '').trim(); }

window.renderTemplateEditor = function() {
    const tpl = currentTemplateBuilder;
    const totalEx = tpl.workout.reduce((acc, d) => acc + d.exercises.length, 0);

    let html = `
        <style>
            .tpl-day { display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:16px; background:linear-gradient(90deg, rgba(168,85,247,.25), rgba(168,85,247,.08) 60%, transparent); border:1px solid rgba(168,85,247,.4); box-shadow:0 0 15px rgba(168,85,247,.12); }
            .tpl-day-num { flex:0 0 44px; width:44px; height:44px; border-radius:12px; background:#a855f7; color:#fff; font-weight:900; font-size:18px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px rgba(168,85,247,.4); }
            .tpl-day-info { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:6px; }
            .tpl-day-name { margin:0; width:100%; color:#fff; font-weight:900; text-transform:uppercase; letter-spacing:.03em; font-size:18px; line-height:1.2; word-break:normal; overflow-wrap:break-word; }
            .tpl-day-count { font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:#d8b4fe; background:rgba(168,85,247,.12); border:1px solid rgba(168,85,247,.35); padding:3px 10px; border-radius:999px; white-space:nowrap; }
            .tpl-row { display:grid; grid-template-columns: 76px minmax(0,1fr) 44px; grid-template-areas: "img name del" "stats stats stats"; column-gap:12px; row-gap:12px; align-items:center; background:#050505; border:1px solid rgba(63,63,70,.8); border-left:4px solid #a855f7; border-radius:12px; padding:12px; transition:border-color .2s; }
            .tpl-row:hover { border-color:#71717a; border-left-color:#a855f7; }
            .tpl-img { grid-area:img; width:76px; height:76px; background:#fff; border-radius:12px; padding:4px; display:flex; align-items:center; justify-content:center; border:1px solid #e4e4e7; }
            .tpl-img img { width:100%; height:100%; object-fit:contain; mix-blend-mode:multiply; }
            .tpl-name { grid-area:name; align-self:center; min-width:0; color:#fff; font-weight:900; text-transform:uppercase; font-size:14px; line-height:1.25; word-break:normal; overflow-wrap:break-word; }
            .tpl-stats { grid-area:stats; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
            .tpl-stat { min-width:0; background:#0a0a0a; border:1px solid #3f3f46; border-radius:10px; padding:8px 6px; text-align:center; }
            .tpl-stat-main { border-color:rgba(168,85,247,.45); }
            .tpl-stat span { display:block; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; color:#a1a1aa; white-space:nowrap; }
            .tpl-stat-main span { color:#d8b4fe; }
            .tpl-stat b { display:block; font-size:15px; font-weight:900; color:#fff; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .tpl-del { grid-area:del; width:44px; height:44px; display:flex; align-items:center; justify-content:center; background:rgba(127,29,29,.3); border:1px solid rgba(239,68,68,.5); color:#f87171; border-radius:10px; cursor:pointer; transition:all .2s; }
            .tpl-del:hover { background:#dc2626; color:#fff; }
        </style>
        <div class="bg-[#050505] border border-purple-500/40 rounded-[2rem] w-full max-w-5xl mx-auto shadow-2xl relative animate-scale-up max-h-[92vh] overflow-y-auto overflow-x-hidden custom-scrollbar">

            <!-- ENCABEZADO -->
            <div class="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur-md border-b border-zinc-800/80 px-5 md:px-8 py-5 flex items-start justify-between gap-4 rounded-t-[2rem]">
                <div class="min-w-0">
                    <p class="text-[11px] font-black text-zinc-500 uppercase tracking-[0.25em] mb-1">Plantilla de rutina</p>
                    <h3 class="text-2xl md:text-3xl font-black uppercase tracking-wide text-purple-400 leading-tight break-words">${tpl.objective}</h3>
                    <div class="flex flex-wrap gap-2 mt-3">
                        <span class="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full"><i class="fa-solid fa-calendar-days"></i> ${tpl.days} días</span>
                        <span class="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full"><i class="fa-solid fa-dumbbell"></i> ${totalEx} ejercicios</span>
                    </div>
                </div>
                <button onclick="closeModal()" class="w-11 h-11 shrink-0 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>

            <!-- DÍAS -->
            <div class="p-4 md:p-8 space-y-8">
                ${tpl.workout.map((dayObj, dIdx) => `
                    <section class="space-y-3">

                        <!-- BARRA DEL DÍA -->
                        <div class="tpl-day">
                            <div class="tpl-day-num">${dIdx + 1}</div>
                            <div class="tpl-day-info">
                                <h4 class="tpl-day-name">${dayObj.day}</h4>
                                <span class="tpl-day-count">${dayObj.exercises.length} ${dayObj.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}</span>
                            </div>
                        </div>

                        <!-- FILAS DE EJERCICIOS (mismo estilo que las carpetas de ejercicios) -->
                        ${dayObj.exercises.length === 0 ? `<div class="text-sm text-zinc-500 font-medium italic text-center py-4 border border-dashed border-zinc-800 rounded-xl">Aún no hay ejercicios en este día.</div>` : ''}
                        ${dayObj.exercises.map((ex, eIdx) => `
                            <article class="tpl-row">
                                <div class="tpl-img"><img src="${ex.img}" onerror="gymImgFix(this)"></div>
                                <div class="tpl-name">${ex.name}</div>
                                <div class="tpl-stats">
                                    <div class="tpl-stat tpl-stat-main"><span>Series</span><b>${tplVal(ex.sets)}</b></div>
                                    <div class="tpl-stat"><span>Reps</span><b>${tplVal(ex.reps)}</b></div>
                                    <div class="tpl-stat"><span>Descanso</span><b>${ex.rest}</b></div>
                                </div>
                                <button onclick="removeExerciseFromTemplate(${dIdx}, ${eIdx})" title="Quitar ejercicio" class="tpl-del"><i class="fa-solid fa-trash"></i></button>
                            </article>
                        `).join('')}

                        <button onclick="openFolderPickerForTemplate(${dIdx})" class="w-full py-3.5 border border-dashed border-zinc-600 text-zinc-300 hover:text-white hover:border-purple-400 hover:bg-purple-500/5 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2">
                            <i class="fa-solid fa-plus"></i> Agregar ejercicio
                        </button>
                    </section>
                `).join('')}
            </div>

            <!-- PIE -->
            <div class="sticky bottom-0 bg-[#050505]/95 backdrop-blur-md border-t border-zinc-800/80 px-5 md:px-8 py-4 rounded-b-[2rem]">
                <button onclick="saveTemplateToState()" class="w-full bg-purple-500 text-white font-black uppercase tracking-widest py-4 rounded-xl text-sm md:text-base hover:bg-purple-400 transition shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar rutina
                </button>
            </div>
        </div>
    `;
    openModal(html);
};

window.updateTemplateDayName = function(dIdx, newVal) {
    currentTemplateBuilder.workout[dIdx].day = newVal;
};

window.removeExerciseFromTemplate = function(dIdx, eIdx) {
    currentTemplateBuilder.workout[dIdx].exercises.splice(eIdx, 1);
    renderTemplateEditor(); // Recarga la vista
};

window.saveTemplateToState = function() {
    // Si estaba editando uno existente, reemplázalo. Si no, agrégalo al final.
    if(currentTemplateBuilder.originalIndex !== undefined) {
        state.routineTemplates[currentTemplateBuilder.originalIndex] = currentTemplateBuilder;
        delete currentTemplateBuilder.originalIndex;
    } else {
        state.routineTemplates.push(currentTemplateBuilder);
    }
    
    // Guardar localmente
    localStorage.setItem('gym_routine_templates', JSON.stringify(state.routineTemplates));
    closeModal();
    renderMainContent(); 
};

window.deleteTemplate = function(idx) {
    if(confirm("¿Eliminar este objetivo por completo?")) {
        state.routineTemplates.splice(idx, 1);
        localStorage.setItem('gym_routine_templates', JSON.stringify(state.routineTemplates));
        renderMainContent();
    }
};

// --- SELECTOR DE CARPETAS (GRUPO MUSCULAR) PARA LA PLANTILLA ---
window.openFolderPickerForTemplate = function(dayIdx) {
    const folders = getMuscleFolders();
    
    let html = `
        <div class="relative bg-[#050505] border border-purple-500/50 shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-lg mx-auto w-full animate-scale-up">
            <button onclick="renderTemplateEditor()" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><i class="fa-solid fa-arrow-left text-xl"></i></button>
            <h3 class="text-lg font-black text-white uppercase tracking-wider mb-5"><i class="fa-solid fa-layer-group text-purple-400"></i> Selecciona un Grupo Muscular</h3>
            
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                ${folders.map(f => `
                    <div onclick="openFolderExercisesForTemplate(${dayIdx}, '${f.id}', '${f.color === '#52525b' ? '#a1a1aa' : f.color}')" class="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:scale-105 transition" style="border-bottom: 2px solid ${f.color};">
                        <i class="fa-solid fa-folder-open text-2xl" style="color: ${f.color};"></i>
                        <span class="text-white font-bold text-[10px] uppercase tracking-wider text-center">${f.name}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    openModal(html);
};

// --- LISTA DE EJERCICIOS DENTRO DE LA CARPETA (CON EL BOTÓN +) ---
window.openFolderExercisesForTemplate = function(dayIdx, muscleGroup, colorHex) {
    const exercisesInGroup = Object.keys(exerciseDetails).filter(name => {
        const exData = exerciseDetails[name];
        if (exData.folder) return exData.folder.toUpperCase() === muscleGroup.toUpperCase();
        return exData.img.toUpperCase().includes(`/${muscleGroup}/`);
    });

    let html = `
        <div class="relative bg-[#050505] border shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-lg mx-auto w-full animate-scale-up" style="border-color: ${colorHex};">
            <button onclick="openFolderPickerForTemplate(${dayIdx})" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><i class="fa-solid fa-arrow-left text-xl"></i></button>
            <h3 class="text-lg font-black uppercase tracking-wider mb-5 flex items-center gap-2" style="color: ${colorHex};">
                <i class="fa-solid fa-folder-open"></i> ${muscleGroup}
            </h3>
            
            <div class="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                ${exercisesInGroup.length === 0 ? `<div class="text-zinc-500 text-sm text-center py-5">Carpeta vacía</div>` : ''}
                
                ${exercisesInGroup.map(exName => {
                    const safeName = exName.replace(/'/g, "\\'");
                    const exData = exerciseDetails[exName];
                    return `
                    <div class="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-2 flex items-center gap-3">
                        <div class="w-12 h-12 bg-white rounded-lg p-1 shrink-0"><img src="${exData.img}" class="w-full h-full object-contain mix-blend-multiply" onerror="gymImgFix(this)"></div>
                        <div class="flex-1 text-xs font-bold text-white uppercase">${exName}</div>
                        <!-- BOTÓN + PARA AÑADIR -->
                        <button onclick="configureExerciseForTemplate(${dayIdx}, '${safeName}')" class="w-10 h-10 flex shrink-0 items-center justify-center bg-zinc-800 hover:bg-white hover:text-black rounded-lg text-zinc-400 transition shadow-md">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    openModal(html);
};

// --- CONFIGURAR SERIES/REPS ANTES DE AGREGARLO AL DÍA ---
window.configureExerciseForTemplate = function(dayIdx, safeName) {
    let html = `
        <div class="relative bg-[#050505] border border-purple-500/50 shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-[2rem] p-6 max-w-sm mx-auto w-full animate-scale-up">
            <button onclick="renderTemplateEditor()" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition"><i class="fa-solid fa-xmark text-xl"></i></button>
            <h3 class="text-sm font-black text-white uppercase tracking-wider mb-2 text-purple-400">Configurar Ejercicio</h3>
            <p class="text-xs text-white font-bold mb-5">${safeName}</p>
            
            <div class="space-y-4">
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Series</label>
                    <select id="tpl_ex_sets" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-purple-500 outline-none mt-1">
                        <option value="3 Series">3 Series</option>
                        <option value="4 Series" selected>4 Series</option>
                        <option value="5 Series">5 Series</option>
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Repeticiones</label>
                    <input type="text" id="tpl_ex_reps" value="10-12 Reps" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-purple-500 outline-none mt-1">
                </div>
                <div>
                    <label class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Descanso</label>
                    <input type="text" id="tpl_ex_rest" value="90 Segundos" class="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 text-white focus:border-purple-500 outline-none mt-1">
                </div>
                
                <button onclick="addExerciseFinalToTemplate(${dayIdx}, '${safeName}')" class="w-full bg-purple-500 text-white font-black uppercase tracking-widest py-3.5 rounded-xl hover:bg-purple-400 transition mt-2">
                    Añadir al Día
                </button>
            </div>
        </div>
    `;
    openModal(html);
};

window.addExerciseFinalToTemplate = function(dayIdx, name) {
    const exData = exerciseDetails[name] || { img: "ejercicios/default.png", desc: "Técnica..." };
    
    currentTemplateBuilder.workout[dayIdx].exercises.push({
        name: name,
        img: exData.img,
        desc: exData.desc,
        sets: document.getElementById('tpl_ex_sets').value,
        reps: document.getElementById('tpl_ex_reps').value,
        rest: document.getElementById('tpl_ex_rest').value
    });
    
    renderTemplateEditor(); // Regresa al editor del día
};