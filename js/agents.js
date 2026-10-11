"use strict";
/* Kits des agents (noms officiels français, valorant-api.com, octobre 2026). Ordre : [id, C, Q, E, X], chaque capacité « Nom|type ».
   Types : smoke (bloque la vue), flash (aveugle, désoriente ou gêne l'entrée), recon (info), wall (mur / barrière), molly (zone de dégâts ou de ralentissement), trap (piège de Sentinelle : info + retard), ab (autre), ult.
   Icônes : https://media.valorant-api.com/agents/<id>/abilities/<grenade|ability1|ability2|ultimate>/displayicon.png (autorisé par la CSP). Mettre à jour à chaque nouvel agent. */
window.KITS = {
  Astra:['41fb69c1-4189-7b37-f117-bcaf1e96f1bf', 'Puits de gravité|ab', 'Impulsion nova|flash', 'Nébuleuse|smoke', 'Forme astrale|ult'],
  Breach:['5f8d3a7f-467b-97f3-062c-13acf203c006', 'Réplique|molly', 'Point d\'ignition|flash', 'Ligne de fracture|flash', 'Onde sismique|ult'],
  Brimstone:['9f0d8ba9-4140-b941-57d3-a7ad57c6b417', 'Balise stimulante|ab', 'Bombe incendiaire|molly', 'Frappe fumigène|smoke', 'Rayon orbital|ult'],
  Chamber:['22697a3d-45bf-8dd7-4fec-84a9e28c69d7', 'Guet-apens|trap', 'Chasseur de têtes|ab', 'Rendez-vous|ab', 'Tour de force|ult'],
  Clove:['1dbf2edd-4729-0984-3115-daa5eed44993', 'Coup de boost|ab', 'Trouble-fête|molly', 'Ruse|smoke', 'Toujours debout|ult'],
  Cypher:['117ed9e3-49f3-6512-3ccf-0cada7e3823b', 'Fil de détente|trap', 'Cybercage|smoke', 'Caméra espionne|recon', 'Vol neural|ult'],
  Deadlock:['cc8b64c8-4b25-4ff9-6e7f-37b4da43d235', 'Disque barrière|wall', 'Radar ultrason|trap', 'GravNet|ab', 'Annihilation|ult'],
  Fade:['dade69b4-4f5a-8528-247b-219e5a1facd6', 'Rôdeur|flash', 'Capture|ab', 'Hanteur|recon', 'Nuit tombante|ult'],
  Gekko:['e370fa57-4757-3604-3648-499e1f642d3f', 'Pogo|molly', 'Altego|flash', 'Verti|flash', 'Mordicus|ult'],
  Harbor:['95b78ed7-4637-86d9-7e41-71ba8c293152', 'Tempête déferlante|flash', 'Marée haute|wall', 'Dôme aqueux|smoke', 'Raz-de-marée|ult'],
  Iso:['0e38b510-41a8-5780-5e8f-568b2a4f2d6c', 'Contingence|wall', 'Sape|ab', 'Tir couplé|ab', 'Duel à huis clos|ult'],
  Jett:['add6443a-41bd-e414-f6ad-e58d267f4e95', 'Averse|smoke', 'Courant ascendant|ab', 'Vent arrière|ab', 'Tempête de lames|ult'],
  'KAY/O':['601dbbe7-43ce-be57-2a40-4abd24953621', 'FRAG/ment|molly', 'MÉMOIRE/flash|flash', 'POINT/zéro|recon', 'CMD/null|ult'],
  Killjoy:['1e58de9c-4950-5125-93e9-a0aee9f98746', 'Essaim de nanites|molly', 'Bot-alarme|trap', 'Tourelle|recon', 'Confinement|ult'],
  Miks:['7c8a4701-4de6-9355-b254-e09bc2a34b72', 'M-pulsion|flash', 'Harmonisation|ab', 'Forme d\'onde|smoke', 'Basse sismique|ult'],
  Neon:['bb2a4828-46eb-8cd1-e765-15848195d751', 'Voie rapide|wall', 'Éclair relais|flash', 'Vitesse supérieure|ab', 'Ultra-vitesse|ult'],
  Omen:['8e253930-4c05-31dd-1b6c-968525494517', 'Voie des ombres|ab', 'Paranoïa|flash', 'Voile sombre|smoke', 'Depuis les ombres|ult'],
  Phoenix:['eb93336a-449b-9c1b-0a54-a891f7921d69', 'Brasier|wall', 'Mains brûlantes|molly', 'Balle courbe|flash', 'Revanche|ult'],
  Raze:['f94c3b30-42be-e959-889c-5aa313dba261', 'Boum Bot|ab', 'Pack explosif|ab', 'Grenade gigogne|molly', 'Bouquet final|ult'],
  Reyna:['a3bfb853-43b2-7238-a4f1-ad90e9e46bcc', 'Œillade|flash', 'Dévoration|ab', 'Rebuffade|ab', 'Impératrice|ult'],
  Sage:['569fdd95-4d10-43ab-ca70-79becc718b46', 'Orbe barrière|wall', 'Orbe de lenteur|molly', 'Orbe de soin|ab', 'Résurrection|ult'],
  Skye:['6f2a04ca-43e0-be17-7f36-b3908627744d', 'Revitalisation|ab', 'Éclaireur|recon', 'Guide éclatant|flash', 'Traqueurs|ult'],
  Sova:['320b2a48-4d9b-a075-30f1-1f93a9b638fa', 'Drone rapace|recon', 'Électroflèche|molly', 'Flèche de reconnaissance|recon', 'Fureur du chasseur|ult'],
  Tejo:['b444168c-4e35-8076-db47-ef9bf368f384', 'Drone furtif|recon', 'Livraison spéciale|flash', 'Salve autoguidée|molly', 'Apocalypse|ult'],
  Veto:['92eeef5d-43b5-1d4a-8d03-b3927a09034b', 'Vortex|ab', 'Étranglement|trap', 'Intercepteur|ab', 'Évolution|ult'],
  Viper:['707eab51-4836-f488-046a-cda6bf494859', 'Morsure du serpent|molly', 'Nuage de poison|smoke', 'Écran toxique|wall', 'Nid de vipères|ult'],
  Vyse:['efba5359-4016-a1e5-7626-b1ae76895940', 'Ronces barbelées|molly', 'Cisaille|wall', 'Rose métallique|flash', 'Jardin d\'acier|ult'],
  Waylay:['df1cb487-4902-002e-5c17-d28e83e78588', 'Saturation|flash', 'Vitesse lumière|ab', 'Réfraction|ab', 'Croisée des chemins|ult'],
  Yoru:['7f94d92c-4234-0a36-9646-3a87eb8b5c89', 'Feinte|ab', 'Angle mort|flash', 'Visite surprise|ab', 'Transfert dimensionnel|ult']
};
