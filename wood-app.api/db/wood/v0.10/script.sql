/*
   Version: v0.009
   Purpose: Seed initial data for Bois (Natural Wood) and its children
   (Insert block commented out to avoid FK dependency on tbl_person id=1; table creations are in other version scripts.)
*/

/*
DO $$
DECLARE
    v_parent_id INTEGER;
BEGIN
    -- 1. Insert or get Parent 'Bois'
    SELECT id INTO v_parent_id FROM tbl_parent WHERE reference = 'Bois';
    
    IF v_parent_id IS NULL THEN
        INSERT INTO tbl_parent (reference, description, creationdate, updatedate, isdeleted, idappuser)
        VALUES ('Bois', 'Bois Naturel', '2024-07-01 07:01:22', '2024-06-30 23:00:00', false, 1)
        RETURNING id INTO v_parent_id;
    END IF;

    -- 2. Insert Children linked to the parent ID
    
    -- BD (Bois Dûr)
    IF NOT EXISTS (SELECT 1 FROM tbl_first_child WHERE reference = 'BD' AND idparent = v_parent_id) THEN
        INSERT INTO tbl_first_child (reference, description, creationdate, updatedate, isdeleted, idappuser, idparent)
        VALUES ('BD', 'Bois Dûr', '2024-06-30 23:00:00', '2024-06-30 23:00:00', false, 1, v_parent_id);
    END IF;

    -- BB (Bois Blanc)
    IF NOT EXISTS (SELECT 1 FROM tbl_first_child WHERE reference = 'BB' AND idparent = v_parent_id) THEN
        INSERT INTO tbl_first_child (reference, description, creationdate, updatedate, isdeleted, idappuser, idparent)
        VALUES ('BB', 'Bois Blanc', '2024-06-30 23:00:00', '2024-06-30 23:00:00', false, 1, v_parent_id);
    END IF;

    -- BR (Bois Rouge)
    IF NOT EXISTS (SELECT 1 FROM tbl_first_child WHERE reference = 'BR' AND idparent = v_parent_id) THEN
        INSERT INTO tbl_first_child (reference, description, creationdate, updatedate, isdeleted, idappuser, idparent)
        VALUES ('BR', 'Bois Rouge', '2024-07-17 12:02:13', '2024-07-17 12:02:13', false, 1, v_parent_id);
    END IF;

END $$;
*/
