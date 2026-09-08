-- ============================================================================
-- joueurs_3_departements.sql — À coller dans Supabase → SQL Editor → Run (une fois)
-- ============================================================================
-- Pourquoi : 127 joueurs ont rempli leur VILLE mais pas leur DÉPARTEMENT.
-- Le département est déduit de la ville via l'annuaire officiel des communes
-- (api-adresse.data.gouv.fr, le même que celui du profil), avec un score de
-- confiance. Quand une ville existe dans plusieurs départements (Montaigu,
-- Bassens…), le bar du joueur départage.
--
-- Ce script ne touche QUE la colonne departement, et seulement si elle est vide
-- (« and departement is null ») : un joueur qui a déjà choisi n'est jamais écrasé.
-- La ville saisie n'est pas modifiée. Relançable sans risque.
--
-- Généré le 2026-09-07. Chaque ligne se lit : pseudo · ville saisie → commune
-- reconnue (n° et nom du département).
-- ============================================================================

-- ── A. 112 joueurs : commune reconnue sans ambiguïté ──────────────────────────
update public.joueurs set departement = '31' where id = 'd9980551-9dcc-48aa-b6ac-871bcd3f349a' and departement is null;  -- _Tom_ · « Villeneuve Tolosane » → Villeneuve-Tolosane (31 Haute-Garonne) score 0.95
update public.joueurs set departement = '22' where id = 'd3c73b4d-00a9-4cc1-8101-864db76732c6' and departement is null;  -- AlanLm · « Trebry » → Trébry (22 Côtes-d'Armor) score 0.93
update public.joueurs set departement = '13' where id = 'cbc5aaf8-a090-4e49-b9b4-d3fa361b5fa6' and departement is null;  -- Alban_SVDC · « Fuveau » → Fuveau (13 Bouches-du-Rhône) score 0.95
update public.joueurs set departement = '78' where id = '4a78764e-09d7-4950-8209-eddfe1491142' and departement is null;  -- AlexDS · « Maisons-Laffitte » → Maisons-Laffitte (78 Yvelines) score 0.95
update public.joueurs set departement = '89' where id = 'b69d8304-e2b6-4071-9d7b-f47fd2e3006f' and departement is null;  -- Autisa · « Vinneuf » → Vinneuf (89 Yonne) score 0.94
update public.joueurs set departement = '47' where id = '696665ce-23b7-461d-a075-28517d5264bb' and departement is null;  -- AYdartshop · « nerac » → Nérac (47 Lot-et-Garonne) score 0.94
update public.joueurs set departement = '22' where id = '1451df04-1b36-4fc4-9ea2-793995293667' and departement is null;  -- Barbu81 · « Les Champs Geraux » → Les Champs-Géraux (22 Côtes-d'Armor) score 0.94
update public.joueurs set departement = '56' where id = 'd65f3bfa-0680-4493-ba67-7cc7c9e4bc79' and departement is null;  -- Béber56 · « Pluvigner » → Pluvigner (56 Morbihan) score 0.94
update public.joueurs set departement = '84' where id = '49f8249c-16f7-4efc-a1db-7e111c8b064e' and departement is null;  -- Ben · « Loriol du comtat » → Loriol-du-Comtat (84 Vaucluse) score 0.94
update public.joueurs set departement = '31' where id = '445c72b9-40e6-43f4-961d-8a160bcc5b65' and departement is null;  -- Benfo · « Toulouse » → Toulouse (31 Haute-Garonne) score 0.96
update public.joueurs set departement = '51' where id = 'd25d7f49-5d0d-48d7-91af-1c7482884d49' and departement is null;  -- Bison · « Châlons en Champagne » → Châlons-en-Champagne (51 Marne) score 0.95
update public.joueurs set departement = '64' where id = 'cd3c8e5e-82bd-4c00-85e8-c7d72236c84c' and departement is null;  -- Boratdarts · « Leren » → Léren (64 Pyrénées-Atlantiques) score 0.93
update public.joueurs set departement = '13' where id = '260aa5da-2add-470e-9fe9-b01f3901aee2' and departement is null;  -- Brainpurple · « Marseille » → Marseille (13 Bouches-du-Rhône) score 0.97
update public.joueurs set departement = '44' where id = '1316d9d5-9d5a-4444-8ed6-4df3e8b3a2ad' and departement is null;  -- Bulldog44 · « Piriac sur mer » → Piriac-sur-Mer (44 Loire-Atlantique) score 0.94
update public.joueurs set departement = '47' where id = '2afab3c2-32cb-4719-84d8-0f404606a7a3' and departement is null;  -- Cekos · « Cuzorn » → Cuzorn (47 Lot-et-Garonne) score 0.93
update public.joueurs set departement = '78' where id = '4899a9b3-fe6f-4209-b9c5-307330dfe3df' and departement is null;  -- Chatdau · « LES ESSARTS LE ROI » → Les Essarts-le-Roi (78 Yvelines) score 0.94
update public.joueurs set departement = '56' where id = 'af9b4178-9fdd-4c32-a1ce-d864564e871f' and departement is null;  -- Choupca · « Augan » → Augan (56 Morbihan) score 0.94
update public.joueurs set departement = '59' where id = 'cf05a772-c93e-4785-81e9-23f6d0411150' and departement is null;  -- Clem · « HAZEBROUCK » → Hazebrouck (59 Nord) score 0.95
update public.joueurs set departement = '64' where id = '1f44d1bf-ce21-456e-9bdd-fd79b937e4c0' and departement is null;  -- coq0rc · « Salies de Bearn » → Salies-de-Béarn (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '42' where id = 'b399358e-0ad8-4a50-ab13-858422cdfdda' and departement is null;  -- Dartagnan42 · « Ouches » → Ouches (42 Loire) score 0.94
update public.joueurs set departement = '07' where id = '93b358e0-ef66-422c-9893-3025448cd090' and departement is null;  -- DARTDÈCHE · « Vallon-Pont-d'Arc » → Vallon-Pont-d'Arc (07 Ardèche) score 0.94
update public.joueurs set departement = '22' where id = '83d0fcfc-333d-4660-8aac-ff65bfd14250' and departement is null;  -- Dav · « Loudeac » → Loudéac (22 Côtes-d'Armor) score 0.95
update public.joueurs set departement = '56' where id = '3a6bc204-14cd-4a34-b00a-19bc2e813ece' and departement is null;  -- Daviddry · « caudan » → Caudan (56 Morbihan) score 0.94
update public.joueurs set departement = '18' where id = '908629a9-9b77-4e7e-8982-fabac3121f62' and departement is null;  -- DavyM · « Menetou-couture » → Menetou-Couture (18 Cher) score 0.93
update public.joueurs set departement = '42' where id = '285aa435-9de2-4015-8d06-c41e36ff050f' and departement is null;  -- Demifraise · « Saint Etienne » → Saint-Étienne (42 Loire) score 0.96
update public.joueurs set departement = '79' where id = '90494cf8-8c31-4475-a23e-c53bcb08d5c0' and departement is null;  -- Djib · « Niort » → Niort (79 Deux-Sèvres) score 0.95
update public.joueurs set departement = '64' where id = 'ccc813ad-2057-404f-9117-852609323aea' and departement is null;  -- DJO_EUSKALDARDOA · « Hasparren » → Hasparren (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '42' where id = '7558bfd6-0865-4b54-99af-baf4da7e7861' and departement is null;  -- Donodarts42 · « Saint Pierre de boeuf » → Saint-Pierre-de-Bœuf (42 Loire) score 0.94
update public.joueurs set departement = '68' where id = '05e07601-0361-4570-98ec-3ca71bca7246' and departement is null;  -- dreyj68 · « guebwiller » → Guebwiller (68 Haut-Rhin) score 0.95
update public.joueurs set departement = '56' where id = '8d64d94f-c1b9-4b13-9904-ec6bb380cdd7' and departement is null;  -- Dvy · « Nivillac » → Nivillac (56 Morbihan) score 0.94
update public.joueurs set departement = '83' where id = '54c5ca9a-f91e-4c24-a912-fdcb410e369b' and departement is null;  -- Easy-C · « Sainte Maxime » → Sainte-Maxime (83 Var) score 0.95
update public.joueurs set departement = '78' where id = 'b8bd2a33-5921-4e2f-963c-f34b711beaeb' and departement is null;  -- Fab · « Maisons-Laffitte » → Maisons-Laffitte (78 Yvelines) score 0.95
update public.joueurs set departement = '42' where id = 'e5bdaa4e-780e-440f-93b3-e7002fa519b2' and departement is null;  -- Fall1n1 · « Chavanay » → Chavanay (42 Loire) score 0.94
update public.joueurs set departement = '85' where id = '6ae63032-d64e-4021-b258-ed8913d31ea5' and departement is null;  -- FranckGirondeen · « Bellevigny » → Bellevigny (85 Vendée) score 0.94
update public.joueurs set departement = '41' where id = 'c759539d-4ea7-4f94-b1fe-446c721ca788' and departement is null;  -- Frangasc · « Danze » → Danzé (41 Loir-et-Cher) score 0.93
update public.joueurs set departement = '40' where id = '5761284a-4f46-48ab-af51-7d8a0005c6ab' and departement is null;  -- Frisé · « Mezos » → Mézos (40 Landes) score 0.93
update public.joueurs set departement = '34' where id = '5712031b-95d2-45fc-8b8e-f1e5e30957c8' and departement is null;  -- Gil · « Olargues » → Olargues (34 Hérault) score 0.93
update public.joueurs set departement = '40' where id = 'f43a2537-e160-4851-9ad9-0f076a3c110a' and departement is null;  -- Gillou · « Narrosse » → Narrosse (40 Landes) score 0.94
update public.joueurs set departement = '64' where id = 'fc4a538f-dff7-4045-a506-191d726de951' and departement is null;  -- Gimli64 · « Itxassou » → Itxassou (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '33' where id = 'e234bb0b-bd80-47ea-8733-f41dd34490c2' and departement is null;  -- Girondingue · « Cerons » → Cérons (33 Gironde) score 0.94
update public.joueurs set departement = '64' where id = 'c3714aa3-78a7-47ce-8012-a213d4ece7bf' and departement is null;  -- GIZMO · « Hasparren » → Hasparren (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '64' where id = '6b662498-89d3-4acd-89c9-5ac2b51b7e65' and departement is null;  -- Guiguipays · « St Jean de Luz » → Saint-Jean-de-Luz (64 Pyrénées-Atlantiques) score 0.95
update public.joueurs set departement = '64' where id = 'e4bd22ae-a7df-41eb-ae51-e9a4d1027771' and departement is null;  -- Hartza · « ESPELETTE » → Espelette (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '36' where id = 'd2f7cae7-c5fa-427e-a47f-6c75cc28b1b7' and departement is null;  -- hermaxe · « Déols » → Déols (36 Indre) score 0.94
update public.joueurs set departement = '88' where id = '761e4917-9827-418c-a6ff-5da8e641d433' and departement is null;  -- Icedarts · « RAON L ETAPE » → Raon-l'Étape (88 Vosges) score 0.94
update public.joueurs set departement = '64' where id = '2d0a0618-54a3-4009-b769-b836092c8a3a' and departement is null;  -- Iker · « Hendaye » → Hendaye (64 Pyrénées-Atlantiques) score 0.95
update public.joueurs set departement = '59' where id = 'f1acfefa-ba0a-4009-8633-d19ad26b9a3a' and departement is null;  -- Jackd592 · « Wallers » → Wallers (59 Nord) score 0.94
update public.joueurs set departement = '59' where id = 'eed391f7-9c12-4c46-8201-72b7960a68d0' and departement is null;  -- Jaguars · « Haubourdin » → Haubourdin (59 Nord) score 0.95
update public.joueurs set departement = '75' where id = '97f0052f-eeab-4894-9fbd-a229fff45f33' and departement is null;  -- Jean50 · « Paris » → Paris (75 Paris) score 0.97
update public.joueurs set departement = '64' where id = 'b26e3b6f-2e62-48de-b526-28db4733ce73' and departement is null;  -- Jeromeprice · « Bayonne » → Bayonne (64 Pyrénées-Atlantiques) score 0.95
update public.joueurs set departement = '62' where id = 'eca04a60-09fd-45ee-b675-d4134a71c8b3' and departement is null;  -- Jipai62 · « LONGUENESSE » → Longuenesse (62 Pas-de-Calais) score 0.95
update public.joueurs set departement = '29' where id = 'e3eaf684-9711-4682-a8bd-e013036beef8' and departement is null;  -- jlseite · « Clohars » → Clohars-Carnoët (29 Finistère) score 0.85
update public.joueurs set departement = '33' where id = '80064e26-7a4e-4a25-85a9-ba469c45d203' and departement is null;  -- JmLab · « Bordeaux » → Bordeaux (33 Gironde) score 0.96
update public.joueurs set departement = '34' where id = '799d112a-2089-43cb-8eca-e37613f2cc71' and departement is null;  -- José · « Béziers » → Béziers (34 Hérault) score 0.96
update public.joueurs set departement = '64' where id = 'f11c131c-2e33-43a7-940c-0a5d4af178b0' and departement is null;  -- Julo710 · « Igon » → Igon (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '31' where id = '98b4598a-540a-4ca7-99ed-ea024eae5e04' and departement is null;  -- Kath31 · « Mondavezan » → Mondavezan (31 Haute-Garonne) score 0.93
update public.joueurs set departement = '29' where id = '55cd5223-37e4-438b-8bdc-6ef1fd9f2be5' and departement is null;  -- Keff · « Combrit » → Combrit (29 Finistère) score 0.94
update public.joueurs set departement = '55' where id = 'aadd1f96-ae51-44bb-8742-aea1370da799' and departement is null;  -- KevinCNVQ · « Les Souhesmes » → Les Souhesmes-Rampont (55 Meuse) score 0.84
update public.joueurs set departement = '64' where id = 'cfcd593e-ed7e-48f3-89de-ef2cfec0f0e8' and departement is null;  -- La Pint’ · « Cambo-Les-Bains » → Cambo-les-Bains (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '87' where id = '776676bd-45e0-4d5a-a815-9f1144a25c81' and departement is null;  -- LaBouleDeJaaj · « Saint Yrieix La Perche » → Saint-Yrieix-la-Perche (87 Haute-Vienne) score 0.94
update public.joueurs set departement = '40' where id = '5c7fe4e7-02a7-4e12-848f-1960ea70f924' and departement is null;  -- Laguibe64 · « Dax » → Dax (40 Landes) score 0.95
update public.joueurs set departement = '31' where id = '909a4fdc-587f-4025-b9ab-d0b6c62860f8' and departement is null;  -- Laguire-Baf · « Toulouse » → Toulouse (31 Haute-Garonne) score 0.96
update public.joueurs set departement = '64' where id = '52162103-759b-4b6f-83d6-4390025cac1f' and departement is null;  -- Lasaitasuna · « Itxassou » → Itxassou (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '55' where id = '22e18dca-e7da-4aff-803a-ac5bc5593fd9' and departement is null;  -- Laurent6255 · « Varennes en argonne » → Varennes-en-Argonne (55 Meuse) score 0.93
update public.joueurs set departement = '06' where id = '2f005235-49b5-4f55-a1ea-fef27a8a7406' and departement is null;  -- LeFish · « Nice » → Nice (06 Alpes-Maritimes) score 0.96
update public.joueurs set departement = '02' where id = '5492028b-0cdf-441b-ba3b-952361c4ec30' and departement is null;  -- Lemorbud · « Savy » → Savy (02 Aisne) score 0.93
update public.joueurs set departement = '44' where id = '8521364c-e622-4e75-89e3-262c06b2a075' and departement is null;  -- LGR · « Nantes » → Nantes (44 Loire-Atlantique) score 0.96
update public.joueurs set departement = '64' where id = '7965b57b-3ad9-4dac-8296-40bb9985318c' and departement is null;  -- Ludo · « Larressore » → Larressore (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '64' where id = '2effd1f9-6691-4e58-81f6-2e2c7d3fbb6c' and departement is null;  -- Lukanini · « Itxassou » → Itxassou (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '73' where id = 'df1f8f1a-543e-4dce-999c-5467e96637ae' and departement is null;  -- Lydan · « Albertville » → Albertville (73 Savoie) score 0.95
update public.joueurs set departement = '64' where id = '22b435ca-ead4-49e5-b2b1-f9ceec99bb05' and departement is null;  -- Maéva · « Larressore » → Larressore (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '59' where id = 'a9cefa02-2746-4c75-9b60-5e7b890a66c0' and departement is null;  -- mamxdsl · « Lille » → Lille (59 Nord) score 0.96
update public.joueurs set departement = '64' where id = '82b04fef-9f63-4864-b403-42094eef9d41' and departement is null;  -- Mathys-Elmatador · « Hasparren » → Hasparren (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '75' where id = 'bf0aa764-5edf-4804-8b8a-7493c490ecd2' and departement is null;  -- Mattpop · « Paris » → Paris (75 Paris) score 0.97
update public.joueurs set departement = '62' where id = '48190e8c-da54-4202-99e5-c1405bd24554' and departement is null;  -- Maxts17 · « Lottinghen » → Lottinghen (62 Pas-de-Calais) score 0.93
update public.joueurs set departement = '24' where id = '7019925c-dcca-494e-899b-ca99d27abd85' and departement is null;  -- Michael · « Boulazac » → Boulazac Isle Manoire (24 Dordogne) score 0.86
update public.joueurs set departement = '65' where id = '71bdf144-412d-4650-9e09-a557f2aa1214' and departement is null;  -- Modjoflow · « Bagnères-de-Bigorre » → Bagnères-de-Bigorre (65 Hautes-Pyrénées) score 0.94
update public.joueurs set departement = '56' where id = '9d8f7f31-624e-4593-bcbf-693645f5de36' and departement is null;  -- MOOSSE · « Malansac » → Malansac (56 Morbihan) score 0.94
update public.joueurs set departement = '14' where id = '70342f97-b1ab-4256-9ca9-a34d28488b51' and departement is null;  -- Nael · « Isigny-sur-Mer » → Isigny-sur-Mer (14 Calvados) score 0.94
update public.joueurs set departement = '64' where id = '3a46398a-cd9d-45b1-ba12-41dfdfc04e6d' and departement is null;  -- NathCDM · « Bayonne » → Bayonne (64 Pyrénées-Atlantiques) score 0.95
update public.joueurs set departement = '17' where id = 'd70bd57b-191f-46d0-a46d-6a731f41aa27' and departement is null;  -- Nico17330 · « Lozay » → Lozay (17 Charente-Maritime) score 0.93
update public.joueurs set departement = '44' where id = 'a50618be-14a8-47cb-9935-f063cb0c7cdc' and departement is null;  -- Niinazou · « St Nicolas De Redon » → Saint-Nicolas-de-Redon (44 Loire-Atlantique) score 0.94
update public.joueurs set departement = '75' where id = 'e1b75196-2e1c-4007-95f5-182f7177489c' and departement is null;  -- PakmaN · « Paris » → Paris (75 Paris) score 0.97
update public.joueurs set departement = '64' where id = '35844f9f-6e51-440a-8ff7-09352b22d07b' and departement is null;  -- Patrice🎯 · « Anglet » → Anglet (64 Pyrénées-Atlantiques) score 0.95
update public.joueurs set departement = '64' where id = '5908a007-4c01-4694-95ec-40248dbbba92' and departement is null;  -- Pottoka · « Irissarry » → Irissarry (64 Pyrénées-Atlantiques) score 0.93
update public.joueurs set departement = '31' where id = '16a340cb-e38b-4299-8ef3-ace9d0f321e9' and departement is null;  -- rabesas · « Rieumes » → Rieumes (31 Haute-Garonne) score 0.94
update public.joueurs set departement = '29' where id = 'fb483ddf-dc92-433f-ad79-c64ec8b8db78' and departement is null;  -- Raphmad · « Henvic » → Henvic (29 Finistère) score 0.94
update public.joueurs set departement = '64' where id = 'ed108a8c-55a9-4832-b04e-f4667292ea32' and departement is null;  -- Richard · « Hasparren » → Hasparren (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '21' where id = 'ab4ddc99-8181-45f4-808a-c19fa8f290c9' and departement is null;  -- Rob · « dijon » → Dijon (21 Côte-d'Or) score 0.96
update public.joueurs set departement = '59' where id = '095931a9-ec41-4214-b7be-08075d5a47e8' and departement is null;  -- Rodriguezzzz59 · « Douai » → Douai (59 Nord) score 0.95
update public.joueurs set departement = '44' where id = 'caf3bab9-a8b4-4292-8494-5461dbba914e' and departement is null;  -- SaintAndrews · « Fay De Bretagne » → Fay-de-Bretagne (44 Loire-Atlantique) score 0.94
update public.joueurs set departement = '85' where id = 'bc19ac90-132e-4041-806b-b9cf89e44146' and departement is null;  -- Seb85 · « Le Champ St Pere » → Le Champ-Saint-Père (85 Vendée) score 0.63
update public.joueurs set departement = '75' where id = '8a22251c-9b4d-450c-b7bd-fee860c11a01' and departement is null;  -- Sputnikdarts · « Paris » → Paris (75 Paris) score 0.97
update public.joueurs set departement = '04' where id = '5a5c4076-3604-437a-9072-735668673f9f' and departement is null;  -- Tabz · « L'escale » → L'Escale (04 Alpes-de-Haute-Provence) score 0.94
update public.joueurs set departement = '78' where id = '65c12947-3104-4831-8fb3-efd367271fd0' and departement is null;  -- Tatoo92 · « Villepreux » → Villepreux (78 Yvelines) score 0.95
update public.joueurs set departement = '34' where id = '832e8c85-1df7-4902-98ee-ea789ceb0f39' and departement is null;  -- the_soldier · « Béziers » → Béziers (34 Hérault) score 0.96
update public.joueurs set departement = '87' where id = 'd584781d-d1f5-4ccd-a03b-479a53a26a04' and departement is null;  -- The-sillent-sting · « Saint-Auvent » → Saint-Auvent (87 Haute-Vienne) score 0.94
update public.joueurs set departement = '64' where id = '483c0603-0a4b-4c85-8097-d21a04b05873' and departement is null;  -- ThejaugDarts · « Cambo-les-Bains » → Cambo-les-Bains (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '75' where id = '77b651a1-3db8-43e0-bec2-1617230fd45a' and departement is null;  -- Theodoro · « Paris » → Paris (75 Paris) score 0.97
update public.joueurs set departement = '87' where id = '00a08bfe-2ecc-474a-9a5b-b4db2ef08061' and departement is null;  -- Thesilentsting · « St Auvent » → Saint-Auvent (87 Haute-Vienne) score 0.94
update public.joueurs set departement = '43' where id = 'db032494-bac6-4bb9-8c6b-2faa852bc18e' and departement is null;  -- TheSniper · « Dunieres » → Dunières (43 Haute-Loire) score 0.94
update public.joueurs set departement = '64' where id = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44' and departement is null;  -- Thomas · « Larressore » → Larressore (64 Pyrénées-Atlantiques) score 0.94
update public.joueurs set departement = '64' where id = 'f65a94e5-a37e-46dc-8c55-04c2d7480960' and departement is null;  -- Tom · « Biarritz » → Biarritz (64 Pyrénées-Atlantiques) score 0.95
update public.joueurs set departement = '64' where id = 'fbc4149b-b374-4e16-b649-c904d36c6d44' and departement is null;  -- TomHam · « BAYONNE » → Bayonne (64 Pyrénées-Atlantiques) score 0.95
update public.joueurs set departement = '64' where id = '5da17582-95fc-4349-a34f-721df7dcab7b' and departement is null;  -- Tytos · « Saint Jean De Luz » → Saint-Jean-de-Luz (64 Pyrénées-Atlantiques) score 0.95
update public.joueurs set departement = '88' where id = 'ffdd7340-123d-4fa8-9f0f-4f4099299686' and departement is null;  -- Wawann · « Remiremont » → Remiremont (88 Vosges) score 0.94
update public.joueurs set departement = '50' where id = '60ef3f78-c12b-4958-ab51-459975a97d76' and departement is null;  -- Wilfried · « Saint germain d'elle » → Saint-Germain-d'Elle (50 Manche) score 0.93
update public.joueurs set departement = '58' where id = 'fe9680e6-1144-452d-956a-1ca248465938' and departement is null;  -- YA1503 · « Saint pierre le moutier » → Saint-Pierre-le-Moûtier (58 Nièvre) score 0.94
update public.joueurs set departement = '07' where id = '5f1f0ca4-9bd3-4c0a-8aed-a9e6c6c4b4ba' and departement is null;  -- Yankee07 · « Ardoix » → Ardoix (07 Ardèche) score 0.94
update public.joueurs set departement = '35' where id = 'db2379ac-3a8d-4ca3-a228-c0bb942f50d9' and departement is null;  -- Yohann_loret · « Dol de Bretagne » → Dol-de-Bretagne (35 Ille-et-Vilaine) score 0.94
update public.joueurs set departement = '29' where id = 'f92d344a-3038-4248-816d-1cc27959719b' and departement is null;  -- Youn · « Clohars » → Clohars-Carnoët (29 Finistère) score 0.85
update public.joueurs set departement = '67' where id = 'fae1d394-3bd2-4411-9dd2-4d6ee5b37986' and departement is null;  -- zernoox · « La Broque » → La Broque (67 Bas-Rhin) score 0.94

-- ── B. 0 joueurs : ville homonyme, départagée par leur bar ─────────────────
-- (aucun)

-- ── C. 6 joueurs : nom que l'annuaire ne connaît pas, réglé à la main ──────────
update public.joueurs set departement = '64' where id = 'da6d4f1f-1156-4749-a3dc-42ba527d0224' and departement is null;  -- Eneko · « Kanbo » → 64 Pyrénées-Atlantiques · Kanbo = Cambo-les-Bains en basque
update public.joueurs set departement = '64' where id = '1526bdc0-273e-4b98-8938-63b358e51b30' and departement is null;  -- Gab · « Kanbo » → 64 Pyrénées-Atlantiques · Kanbo = Cambo-les-Bains en basque
update public.joueurs set departement = '59' where id = '50470fcd-1cb4-4ac8-bdd2-81804de52b84' and departement is null;  -- Jalapeno · « Lomme » → 59 Nord · Lomme, commune associée à Lille (l'annuaire répondait Lommerange en Moselle)
update public.joueurs set departement = '76' where id = 'a5dc8d5b-5224-4e7a-a3ed-17ce8b67ab2a' and departement is null;  -- Jonadarts76 · « Eu » → 76 Seine-Maritime · Eu (Seine-Maritime), mot trop court pour l'annuaire
update public.joueurs set departement = '85' where id = '31e5acdd-8c80-47e4-ab26-d427d874d831' and departement is null;  -- ThibThib85 · « Chambretaud » → 85 Vendée · Chambretaud, commune fusionnée dans Chanverrie (Vendée)
update public.joueurs set departement = '64' where id = '6b21a6cd-2232-46ea-bd54-6725cbf3a065' and departement is null;  -- YvesLo · « cambo » → 64 Pyrénées-Atlantiques · abréviation locale de Cambo-les-Bains

-- ── D. 9 joueurs : PAS SÛR, à décider (lignes désactivées par « -- ») ───────
-- Pour en appliquer une : enlever les deux tirets au début de la ligne, mettre le bon numéro.
-- update public.joueurs set departement = '33' where id = '9f0e7d12-ed33-42f8-82af-2abf1d83e44a' and departement is null;  -- Dave · « Bassens » · candidats : Bassens (33, score 0.95), Bassens (73, score 0.94), Basseneville (14, score 0.36), Bassemberg (67, score 0.32) · pré-rempli avec le plus probable : 33
-- update public.joueurs set departement = '??' where id = 'a1c05806-1db2-4a73-a3b5-341b0386443e' and departement is null;  -- Didi · « Many-Cours » · candidats : aucun
-- update public.joueurs set departement = '64' where id = 'fc6b4e05-5d76-4ee8-a68f-fb65fd399683' and departement is null;  -- Engelman · « Villefranque » · candidats : Villefranque (64, score 0.94), Villefranque (65, score 0.92), Villefrancœur (41, score 0.43) · pré-rempli avec le plus probable : 64
-- update public.joueurs set departement = '??' where id = '585ebdb6-0430-485b-b24d-3f6c0c7c1e83' and departement is null;  -- Greg · « Chicago » · candidats : aucun
-- update public.joueurs set departement = '85' where id = 'dec7953e-b428-4cae-befc-9fb642606771' and departement is null;  -- Ludo856 · « Montaigu » · son pseudo contient 85 → sans doute Montaigu-Vendée (85) · candidats : Montaigu (02, score 0.93), Montaigu (39, score 0.93), Montaigu-Vendée (85, score 0.86), Montaigut-sur-Save (31, score 0.85) · pré-rempli avec le plus probable : 85
-- update public.joueurs set departement = '37' where id = 'f13be7a9-9f72-40b8-90af-a941a6c17c50' and departement is null;  -- Oliver · « Luynes » · Luynes est une commune d'Indre-et-Loire (37) MAIS aussi un quartier d'Aix-en-Provence (13) · candidats : Luynes (37, score 0.94) · pré-rempli avec le plus probable : 37
-- update public.joueurs set departement = '27' where id = '8a40d3e4-37f4-4252-931a-7aaff1e1993b' and departement is null;  -- Pascal66 · « Vernon » · candidats : Vernon (27, score 0.95), Vernon (86, score 0.93), Vernon (07, score 0.93), Vernonvilliers (10, score 0.83) · pré-rempli avec le plus probable : 27
-- update public.joueurs set departement = '59' where id = '4e0f6a60-53e2-4314-bc73-af203b92894c' and departement is null;  -- Sebzeg · « Bailleul » · candidats : Bailleul (59, score 0.95), Bailleul (61, score 0.93), Bailleul (80, score 0.93), Bailleul-sur-Thérain (60, score 0.85) · pré-rempli avec le plus probable : 59
-- update public.joueurs set departement = '??' where id = 'c90b347a-486c-4ce6-93f1-51fdc9f87f41' and departement is null;  -- XYZ75 · « XYZ75 » · candidats : aucun

-- ── Vérification : combien de joueurs par département après le script ──────
select departement, count(*) as joueurs
  from public.joueurs
 where departement is not null
 group by departement
 order by joueurs desc, departement;
