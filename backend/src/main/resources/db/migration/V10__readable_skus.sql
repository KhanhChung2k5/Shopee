-- Replace the generated sample codes (SAMPLE-SP-D9 …) with readable SKUs: PLATFORM-KIND-ITEM[-VERSION].
-- KIND is GAME (game disc), CTL (controller) or ACC (accessory). Orders, receipts and stock reference
-- variants by id, so only product_variants.sku changes. Rows that no longer carry the old code are left alone.
UPDATE product_variants v
SET sku = m.new_sku
FROM (VALUES
    ('SAMPLE-SP-D1',  'PS5-GAME-HZD-REMASTERED'),
    ('SAMPLE-SP-D2',  'PS5-GAME-LEGO-HORIZON'),
    ('SAMPLE-SP-D3',  'PS5-GAME-UNTIL-DAWN'),
    ('SAMPLE-SP-D4',  'PS5-GAME-ASTRO-BOT'),
    ('SAMPLE-SP-D5',  'PS5-GAME-STELLAR-BLADE'),
    ('SAMPLE-SP-D6',  'PS5-GAME-RISE-OF-RONIN'),
    ('SAMPLE-SP-D7',  'PS5-GAME-TLOU2-REMASTERED'),
    ('SAMPLE-SP-D9',  'PS5-GAME-SPIDERMAN2'),
    ('SAMPLE-SP-D10', 'PS5-GAME-FF16'),
    ('SAMPLE-SP-D11', 'PS5-GAME-FORSPOKEN'),
    ('SAMPLE-SP-D12', 'PS5-GAME-GOW-RAGNAROK'),
    ('SAMPLE-SP-D13', 'PS5-GAME-GT7'),
    ('SAMPLE-SP-D15', 'PS5-GAME-DEATH-STRANDING-DC'),
    ('SAMPLE-SP-D16', 'PS5-GAME-RATCHET-RIFT-APART'),
    ('SAMPLE-SP-D17', 'PS5-GAME-NIOH-COLLECTION'),
    ('SAMPLE-SP-C1',  'PS5-CTL-DS-CHROMA-INDIGO'),
    ('SAMPLE-SP-C2',  'PS5-CTL-DS-CHROMA-PEARL'),
    ('SAMPLE-SP-C3',  'PS5-CTL-DS-PURPLE'),
    ('SAMPLE-SP-C4',  'PS5-CTL-DS-VOLCANIC-RED'),
    ('SAMPLE-SP-C5',  'PS5-CTL-DS-EDGE'),
    ('SAMPLE-SP-C6',  'PS5-CTL-DS-NOVA-PINK'),
    ('SAMPLE-SP-C7',  'PS5-CTL-ACCESS'),
    ('SAMPLE-SP-A1',  'PS5-ACC-COVER-COBALT-BLUE'),
    ('SAMPLE-SP-A2',  'PS5-ACC-COVER-VOLCANIC-RED'),
    ('SAMPLE-SP-A3',  'PS5-ACC-COVER-GREY-CAMO'),
    ('SAMPLE-SP-A4',  'PS5-ACC-COVER-STERLING-SILVER'),
    ('SAMPLE-SP-A5',  'PS5-ACC-DS-CHARGING-STATION'),
    ('SAMPLE-SP-A6',  'PS5-ACC-HD-CAMERA')
) AS m(old_sku, new_sku)
WHERE v.sku = m.old_sku;
