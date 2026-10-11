"use strict";
/* ================= DONNÉES DU JEU (site public) =================
   Rôles et couleurs signature des agents, cartes, rangs, polices. Images officielles : media.valorant-api.com (autorisé par la CSP).
   Ids des agents : window.KITS (js/agents.js = copie de data/agents.js). Nouvel agent : data/agents.js + ROLE_OF + AGENT_COL ici. */
const VA = 'https://media.valorant-api.com';
const TIERS_ID = '03621f52-342b-cf4e-4f86-9350a49c6d04'; // table des rangs actuelle (valorant-api)
const ROLE_OF = {Iso:'Duelist', Jett:'Duelist', Neon:'Duelist', Phoenix:'Duelist', Raze:'Duelist', Reyna:'Duelist', Waylay:'Duelist', Yoru:'Duelist',
  Breach:'Initiator', Fade:'Initiator', Gekko:'Initiator', 'KAY/O':'Initiator', Skye:'Initiator', Sova:'Initiator', Tejo:'Initiator',
  Astra:'Controller', Brimstone:'Controller', Clove:'Controller', Harbor:'Controller', Miks:'Controller', Omen:'Controller', Viper:'Controller',
  Chamber:'Sentinel', Cypher:'Sentinel', Deadlock:'Sentinel', Killjoy:'Sentinel', Sage:'Sentinel', Veto:'Sentinel', Vyse:'Sentinel'};
const ROLE_FR = {Duelist:'Duelliste', Initiator:'Initiateur', Controller:'Contrôleur', Sentinel:'Sentinelle'};
// couleur signature de chaque agent (accent de l'interface quand c'est ton agent)
const AGENT_COL = {Iso:'#8a6bff', Jett:'#7fd0ff', Neon:'#2f8cff', Phoenix:'#ff7a2f', Raze:'#ff9a1f', Reyna:'#b44cff', Waylay:'#ffd36b', Yoru:'#3a5cff',
  Breach:'#ff6a3d', Fade:'#7d6bd8', Gekko:'#b6ff3b', 'KAY/O':'#62b8ff', Skye:'#6fd65a', Sova:'#4a8cff', Tejo:'#f0a83c',
  Astra:'#c46bff', Brimstone:'#ff8a3d', Clove:'#ff6fae', Harbor:'#19c3d6', Miks:'#7dd3fc', Omen:'#6d5bff', Viper:'#3cff7a',
  Chamber:'#e0b84a', Cypher:'#d9dde3', Deadlock:'#9fc3d9', Killjoy:'#ffd400', Sage:'#3fe0c5', Veto:'#6ee7b7', Vyse:'#b38cff'};
// style automatique selon le rôle : police des titres et effet de fond
const ROLE_STYLE = {Duelist:{font:'bebas', fx:'neon'}, Initiator:{font:'rajdhani', fx:'scan'}, Controller:{font:'orbitron', fx:'particules'}, Sentinel:{font:'chakra', fx:'grain'}};
const MAP_ID = {Ascent:'7eaecc1b-4337-bbf6-6ab9-04b8f06b3319', Split:'d960549e-485c-e861-8d71-aa9d1aed12a2', Fracture:'b529448b-4d60-346e-e89e-00a4c527a405',
  Bind:'2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba', Breeze:'2fb9a4fd-47b8-4e7d-a969-74b4046ebd53', Abyss:'224b0a95-48b9-f703-1bd8-67aca101a61f',
  Lotus:'2fe4ed3a-450a-948b-6d6b-e89a78e680a9', Sunset:'92584fbe-486a-b1b2-9faa-39b0f486b498', Pearl:'fd267378-4d1d-484f-ff52-77821ed10dc2',
  Summit:'756da597-416b-c0f2-f47b-afbdf28670bc', Icebox:'e2ad5c54-4114-a870-9641-8ea21279579a', Corrode:'1c18ab1f-420d-0d8b-71d0-77ad3c439115',
  Haven:'2bee0dc9-4ffe-519b-1cbd-7fbe763a6047'}; // même table que js/core.js du hub
const MAP_COL = {Ascent:'#e3b26a', Bind:'#e07b39', Haven:'#d6a94a', Split:'#5fc3b3', Icebox:'#7fd1f0', Breeze:'#3fd0c9', Fracture:'#ff6a45', Pearl:'#4a9cff',
  Lotus:'#c46ad6', Sunset:'#ff8a4c', Abyss:'#7b8cff', Corrode:'#9bd16a', Summit:'#a0c8ff'};
const TIER_FR = ['Fer', 'Bronze', 'Argent', 'Or', 'Platine', 'Diamant', 'Ascendant', 'Immortel'];
const TIER_COL = ['#9a9d9a', '#c0844f', '#d5dde0', '#eccf56', '#59c3c9', '#c88bf0', '#3fd68f', '#e0456f', '#ffe9a0'];
const tierFr = id => { id = Math.round(id || 0); return id >= 27 ? 'Radiant' : id >= 3 ? `${TIER_FR[Math.floor((id - 3) / 3)]} ${(id - 3) % 3 + 1}` : 'Non classé'; };
const tierCol = id => id >= 27 ? TIER_COL[8] : id >= 3 ? TIER_COL[Math.floor((id - 3) / 3)] : '#8b93a1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMG = {
  agent:(a, k = 'displayicon') => { const x = (window.KITS || {})[a]; return x ? `${VA}/agents/${x[0]}/${k}.png` : ''; }, // displayicon | fullportrait | background | killfeedportrait
  map:(m, k = 'splash') => MAP_ID[m] ? `${VA}/maps/${MAP_ID[m]}/${k}.png` : '', // splash | listviewicon | displayicon
  card:(id, k = 'wideart') => UUID_RE.test(id || '') ? `${VA}/playercards/${id}/${k}.png` : '', // smallart | largeart | wideart
  rank:t => t >= 3 && t <= 27 ? `${VA}/competitivetiers/${TIERS_ID}/${Math.round(t)}/largeicon.png` : ''
};
const REGIONS = [['eu', 'Europe'], ['na', 'Amérique du Nord'], ['latam', 'Amérique latine'], ['br', 'Brésil'], ['ap', 'Asie-Pacifique'], ['kr', 'Corée']];
// polices : « g » = Google Fonts, chargée seulement si on la choisit ; « local » = dans le dossier fonts/
const FONTS = {
  systeme:{n:'Système', css:'"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif'},
  marker:{n:'Permanent Marker (pinceau)', css:'"Permanent Marker",cursive', local:true},
  teko:{n:'Teko (compact)', css:'"Teko","Segoe UI",sans-serif', g:'Teko:wght@500;600;700'},
  bebas:{n:'Bebas Neue (duelliste)', css:'"Bebas Neue","Segoe UI",sans-serif', g:'Bebas+Neue'},
  rajdhani:{n:'Rajdhani (initiateur)', css:'"Rajdhani","Segoe UI",sans-serif', g:'Rajdhani:wght@500;600;700'},
  orbitron:{n:'Orbitron (contrôleur)', css:'"Orbitron","Segoe UI",sans-serif', g:'Orbitron:wght@500;700;800'},
  chakra:{n:'Chakra Petch (sentinelle)', css:'"Chakra Petch","Segoe UI",sans-serif', g:'Chakra+Petch:wght@500;600;700'},
  oxanium:{n:'Oxanium (tech)', css:'"Oxanium","Segoe UI",sans-serif', g:'Oxanium:wght@500;700'},
  russo:{n:'Russo One (gras)', css:'"Russo One","Segoe UI",sans-serif', g:'Russo+One'},
  exo:{n:'Exo 2 (futuriste)', css:'"Exo 2","Segoe UI",sans-serif', g:'Exo+2:wght@500;700'},
  anton:{n:'Anton (affiche)', css:'"Anton","Segoe UI",sans-serif', g:'Anton'}
};
const FX_FR = {auto:'Auto (selon ton rôle)', aucun:'Aucun', grain:'Grain', scan:'Lignes d\'écran', neon:'Néon', particules:'Particules'};
const MODE_FR = {auto:'Agent principal', dernier:'Dernier agent joué', neutre:'Neutre', agent:'Agent au choix', rang:'Mon rang', carte:'Carte préférée', cartejoueur:'Ma carte de joueur', perso:'Tout à la main'};
const BG_FR = {auto:'Auto', art:'Art de l\'agent', portrait:'Portrait de l\'agent', splash:'Image de carte', card:'Ma carte de joueur', degrade:'Dégradé seul', image:'Mon image'};
const BLOCK_FR = {kpis:'Chiffres clés', forme:'Forme récente', rr:'Courbe de RR', agents:'Meilleurs agents', cartes:'Meilleures cartes', records:'Records', dernier:'Dernière partie'};
const CAT_FR = {ouverture:'Duels d\'ouverture', trade:'Trades', mid:'Milieu de round', clutch:'Clutchs', post:'Après ton plant', retake:'Retakes', plant:'Plants', fin:'Fin de round'};
const END_FR = {elim:'tous éliminés', spike:'spike explosé', defuse:'spike désamorcé', time:'temps écoulé'};
const BUY_FR = {eco:'Éco', force:'Force', full:'Full buy'};
// exercices gratuits (Range, Deathmatch, aim trainers) selon le point faible
const DRILL = {
  hs:['Range : 3 × 30 bots « moyen » en visant la tête seulement', 'Deathmatch : 2 parties en ne tirant qu\'à hauteur de tête', 'Aim trainer gratuit : 5 min de suivi de cible lente'],
  op:['Customs : entraîne les pre-aims des 3 premiers angles de chaque site', 'Deathmatch : joue les coins, tire au premier pixel visible', 'Avant chaque ouverture : demande une info ou une flash'],
  fd:['Revois 3 de tes premières morts : où étais-tu, qui pouvait te reprendre ?', 'En ranked : entre en 2e, juste derrière ton duelliste', 'Joue avec ta capacité de survie prête (mur, dash, smoke)'],
  tr:['Reste à 1-2 secondes d\'un coéquipier en entrée', 'Annonce ta position avant de prendre un duel', 'Après une mort alliée : reprends le duel tout de suite ou recule'],
  dmg:['Utilise tes capacités offensives à chaque round', 'Range : spray contrôlé 10 balles à 15 m', 'Tire dès qu\'un ennemi est visible, même à travers une smoke légère'],
  b0:['Range : bots qui se déplacent, à moins de 10 m', 'Deathmatch au Judge / Spectre pour les réflexes de près', 'Essaie +5 % de sensibilité pendant 8 parties'],
  b1:['Range : rafales de 2-3 balles à 15-20 m', 'Contre-strafe avant chaque tir', 'Deathmatch Vandal / Phantom en rafales'],
  b2:['Range : bots lointains au Vandal, 1 balle à la fois', 'Arrête-toi complètement avant de tirer de loin', 'Essaie −5 % de sensibilité pendant 8 parties'],
  ok:['Garde ta routine : 10 min de Range avant de jouer', 'Travaille ton point fort pour en faire une arme', 'Revois une partie gagnée : qu\'as-tu fait de bien ?']
};
