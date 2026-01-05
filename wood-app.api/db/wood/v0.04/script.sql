-- History table
CREATE TABLE tbl_quantity_mouvement_history (
    id SERIAL PRIMARY KEY,
    original_movement_id INTEGER NOT NULL,
    documentid INTEGER NOT NULL,
    merchandiseid INTEGER NOT NULL,
    lengthids TEXT,
    quantity DECIMAL(10,4),
    archiveddate TIMESTAMP NOT NULL,
    FOREIGN KEY (merchandiseid) REFERENCES tbl_merchandise(id) ON DELETE CASCADE
);

-- Length details history
CREATE TABLE tbl_list_of_lengths_history (
    id SERIAL PRIMARY KEY,
    historyid INTEGER NOT NULL,
    lengthappvarid INTEGER,
    numberofpieces INTEGER,
    quantity DECIMAL(10,4),
    FOREIGN KEY (historyid) REFERENCES tbl_quantity_mouvement_history(id) ON DELETE CASCADE,
    FOREIGN KEY (lengthappvarid) REFERENCES tbl_app_var_length(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX idx_quantity_history_merchandise ON tbl_quantity_mouvement_history(merchandiseid);
CREATE INDEX idx_quantity_history_original ON tbl_quantity_mouvement_history(original_movement_id);
CREATE INDEX idx_length_history_parent ON tbl_list_of_lengths_history(historyid);