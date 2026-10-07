-- Les solutions déjà en place gardent leur comportement d'avant la colonne
-- overageAllowed : le dépassement continue d'être facturé, l'assistant ne se
-- met pas en pause. Seules les nouvelles activations partent sur « refusé ».
UPDATE "client_service" SET "overageAllowed" = true;
