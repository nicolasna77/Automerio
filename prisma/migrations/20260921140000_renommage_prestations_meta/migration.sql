-- Meta interdit d'employer ses marques dans le nom d'un produit ou d'un service
-- tiers, et d'accoler la marque a un terme generique — « Assistant WhatsApp »
-- cumule les deux. La tournure descriptive « sur WhatsApp » est celle que leurs
-- guidelines donnent en exemple.
--
-- La condition sur l'ancien nom laisse intact un libelle que l'equipe aurait
-- deja modifie depuis l'espace admin.
UPDATE "service" SET "name" = 'Réponses automatiques sur WhatsApp'
WHERE "slug" = 'assistant-whatsapp' AND "name" = 'Assistant WhatsApp';

UPDATE "service" SET "name" = 'Réponses automatiques sur Messenger'
WHERE "slug" = 'assistant-facebook' AND "name" = 'Assistant Facebook Messenger';

UPDATE "service" SET "name" = 'Réponses automatiques sur Instagram'
WHERE "slug" = 'assistant-instagram' AND "name" = 'Assistant Instagram';
