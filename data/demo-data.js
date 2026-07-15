window.ORIZZONTE_DEMO_DATA = {
  customer: {
    name: "Bruno Franze",
    initials: "BF",
    email: "bruno_pg@test.it",
    company: "Demo Store SRL",
    role: "Amministratore",
    plan: "Professional",
    tenant: "Workspace di Bruno",
    memberSince: "02 luglio 2026"
  },
  license: {
    code: "O360-PRO-DEMO-7F4A-91C2",
    status: "Attiva",
    edition: "SaaS Cloud",
    seats: 5,
    usedSeats: 2,
    companies: 3,
    usedCompanies: 1,
    renewal: "02 agosto 2026",
    activatedAt: "02 luglio 2026",
    environment: "Cloud EU"
  },
  releases: [
    {version:"1.0.0-RC1",date:"15 luglio 2026",channel:"Stable",status:"Disponibile",summary:"Release Candidate con Digital Twin, Import Enterprise e Release Center."},
    {version:"0.9.5",date:"02 luglio 2026",channel:"Previous",status:"Archiviata",summary:"Billing SaaS, multi-tenant e OpenAI Advisor."},
    {version:"0.9.0",date:"18 giugno 2026",channel:"Previous",status:"Archiviata",summary:"OSINT, Predictive AI e Autonomous Agents."}
  ],
  downloads: [
    {id:"manual-user",title:"Manuale utente RC1",type:"Manuale",format:"DOCX",size:"2.8 MB",edition:"Tutte",available:true},
    {id:"presentation",title:"Presentazione Enterprise",type:"Commerciale",format:"PPTX",size:"5.4 MB",edition:"Tutte",available:true},
    {id:"dataset",title:"Dataset Enterprise Demo",type:"Dataset",format:"XLSX",size:"180 KB",edition:"Professional",available:true},
    {id:"docker",title:"Docker Appliance",type:"Software",format:"ZIP",size:"—",edition:"Enterprise",available:false},
    {id:"windows",title:"Enterprise Windows Installer",type:"Software",format:"EXE",size:"—",edition:"Enterprise",available:false},
    {id:"white-label",title:"White Label Build",type:"Software",format:"ZIP",size:"—",edition:"White Label",available:false}
  ],
  docs: [
    {title:"Guida rapida",category:"Utente",description:"Primo accesso, tenant, azienda e dashboard.",status:"Disponibile"},
    {title:"Manuale Professional",category:"Utente",description:"Guida completa ai moduli e ai flussi operativi.",status:"In preparazione"},
    {title:"Administrator Guide",category:"Amministratore",description:"Deploy, sicurezza, backup e configurazione.",status:"In preparazione"},
    {title:"Developer Guide",category:"Sviluppatore",description:"Backend, frontend, API e database.",status:"In preparazione"},
    {title:"API Reference",category:"Sviluppatore",description:"Endpoint e integrazioni.",status:"Pianificata"},
    {title:"White Label Guide",category:"Partner",description:"Brand, build e distribuzione dedicata.",status:"Pianificata"}
  ],
  academy: [
    {title:"Introduzione a Orizzonte360",duration:"12 min",level:"Base",progress:100},
    {title:"Tenant, workspace e aziende",duration:"18 min",level:"Base",progress:60},
    {title:"Come leggere Oracle Score",duration:"22 min",level:"Intermedio",progress:0},
    {title:"Predictive AI e Digital Twin",duration:"35 min",level:"Avanzato",progress:0},
    {title:"Cyber, OSINT e Finding",duration:"28 min",level:"Avanzato",progress:0},
    {title:"Release Center e diagnostica",duration:"16 min",level:"Amministratore",progress:0}
  ],
  invoices: [
    {number:"INV-2026-007",date:"02 luglio 2026",amount:"€49,00",status:"Pagata",description:"Piano Professional"},
    {number:"INV-2026-006",date:"02 giugno 2026",amount:"€49,00",status:"Pagata",description:"Piano Professional"},
    {number:"INV-2026-005",date:"02 maggio 2026",amount:"€49,00",status:"Pagata",description:"Piano Professional"}
  ],
  notifications: [
    {id:1,type:"release",title:"Nuova release disponibile",message:"Orizzonte360 1.0.0-RC1 è disponibile.",date:"Oggi, 10:30",read:false},
    {id:2,type:"docs",title:"Manuale aggiornato",message:"È disponibile una nuova versione del tutorial cliente.",date:"Ieri, 16:20",read:false},
    {id:3,type:"billing",title:"Rinnovo programmato",message:"Il piano Professional si rinnoverà il 02 agosto 2026.",date:"14 luglio, 09:00",read:false}
  ],
  tickets: [
    {id:"TCK-1042",subject:"Configurazione import multi-foglio",category:"Supporto",priority:"Media",status:"Aperto",updated:"15 luglio 2026"},
    {id:"TCK-1038",subject:"Informazioni White Label",category:"Commerciale",priority:"Bassa",status:"Chiuso",updated:"10 luglio 2026"}
  ]
};