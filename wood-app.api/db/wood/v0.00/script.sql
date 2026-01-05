-- Create tbl_app_health table
CREATE TABLE IF NOT EXISTS tbl_app_health (
    id SERIAL NOT NULL PRIMARY KEY,
    name TEXT,
    value TEXT,
    iscr BOOLEAN
);

-- Create Table Person and User 
-- A User is just a person who uses the app of the enterprise
-- tbl_person
CREATE TABLE IF NOT EXISTS tbl_person (
    id SERIAL NOT NULL PRIMARY KEY,
	  guid UUID,
    firstname TEXT,
    lastname TEXT,
    fullname TEXT,
    birthdate TIMESTAMP,
    cin TEXT,
    idcnss TEXT,
    idrole INTEGER,
    address TEXT,
    birthtown TEXT,
    bankname TEXT,
    bankaccount TEXT,
    phonenumber TEXT,
    isdeleted BOOLEAN,
    isappuser BOOLEAN,
    hiredate TIMESTAMP,
    firedate TIMESTAMP,
    creationdate TIMESTAMP,
	  updatedate TIMESTAMP,
    idappuser INTEGER -- Person who updated this table (UpdatedBy)
);
-- tbl_app_user
CREATE TABLE IF NOT EXISTS tbl_app_user (
    id SERIAL NOT NULL PRIMARY KEY,
	  login TEXT,
    email TEXT,
    isactive BOOLEAN,
    passwordhash BYTEA,
    passwordsalt BYTEA,
    idsalessite INTEGER,
    idperson INTEGER,
    enterpriseid INTEGER,
);

-- Add foreign key dependency if it does not already exist.
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_app_user_tbl_person'
    )
    THEN
        ALTER TABLE tbl_app_user
        ADD CONSTRAINT fk_tbl_app_user_tbl_person
        FOREIGN KEY (idperson) REFERENCES tbl_person (id);
    END IF;
END
$$;

-- Add foreign key dependency if it does not already exist.
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_app_user_tbl_enterprise'
    )
    THEN
        ALTER TABLE tbl_app_user
        ADD CONSTRAINT fk_tbl_app_user_tbl_enterprise
        FOREIGN KEY (enterpriseid) REFERENCES tbl_enterprise (id);
    END IF;
END
$$;

-- Add foreign key dependency if it does not already exist.
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_app_user_tbl_sales_sites'
    )
    THEN
        ALTER TABLE tbl_app_user
        ADD CONSTRAINT fk_tbl_app_user_tbl_sales_sites
        FOREIGN KEY (idsalessite) REFERENCES tbl_sales_sites (id);
    END IF;
END
$$;

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Create Tables for Categories and Sub-Categories
-- tbl_parent
CREATE TABLE IF NOT EXISTS tbl_parent (
    id SERIAL NOT NULL PRIMARY KEY,
	  reference TEXT,
    description TEXT,
    creationdate TIMESTAMP,
	  updatedate TIMESTAMP,
    isdeleted BOOLEAN,
    idappuser INTEGER -- Person who updated this table (UpdatedBy)
);

-- tbl_first_child
CREATE TABLE IF NOT EXISTS tbl_first_child (
    id SERIAL NOT NULL PRIMARY KEY,
	  reference TEXT,
    description TEXT,
    creationdate TIMESTAMP,
	  updatedate TIMESTAMP,
    isdeleted BOOLEAN,
    idappuser INTEGER, -- Person who updated this table (UpdatedBy)
    idparent INTEGER
);


 -- Add foreign key dependency if it does not already exist.
 -- tbl_first_child > tbl_parent
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_first_child_tbl_parent'
    )
    THEN
        ALTER TABLE tbl_first_child
        ADD CONSTRAINT fk_tbl_first_child_tbl_parent
        FOREIGN KEY (idparent) REFERENCES tbl_parent (id);
    END IF;
END
$$;

 -- Add foreign key dependency if it does not already exist.
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_first_child_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_first_child
        ADD CONSTRAINT fk_tbl_first_child_tbl_app_user
        FOREIGN KEY (idappuser) REFERENCES tbl_person (id);
    END IF;
END
$$;


-- tbl_second_child
CREATE TABLE IF NOT EXISTS tbl_second_child (
    id SERIAL NOT NULL PRIMARY KEY,
	  reference TEXT,
    description TEXT,
    creationdate TIMESTAMP,
	  updatedate TIMESTAMP,
    isdeleted BOOLEAN,
    idappuser INTEGER, -- Person who updated this table (UpdatedBy)
    idfirstchild INTEGER
);

 -- Add foreign key dependency if it does not already exist.
 -- tbl_second_child > tbl_first_child
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_second_child_tbl_first_child'
    )
    THEN
        ALTER TABLE tbl_second_child
        ADD CONSTRAINT fk_tbl_second_child_tbl_first_child
        FOREIGN KEY (idfirstchild) REFERENCES tbl_first_child (id);
    END IF;
END
$$;

 -- Add foreign key dependency if it does not already exist.
 -- tbl_second_child > tbl_person
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_second_child_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_second_child
        ADD CONSTRAINT fk_tbl_second_child_tbl_app_user
        FOREIGN KEY (idappuser) REFERENCES tbl_app_user (id);
    END IF;
END
$$;

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================
-- tbl_bank
CREATE TABLE IF NOT EXISTS tbl_bank (
    id SERIAL NOT NULL PRIMARY KEY,
	  reference TEXT,
    description TEXT,
    logo TEXT,
    agency TEXT,
    rib TEXT,
    iban TEXT,
    creationdate TIMESTAMP,
	  updatedate TIMESTAMP,
    isdeleted BOOLEAN,
    idappuser INTEGER -- Person who updated this table (UpdatedBy)
);

-- Add foreign key dependency if it does not already exist.
 -- tbl_bank > tbl_person
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_bank_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_bank
        ADD CONSTRAINT fk_tbl_bank_tbl_app_user
        FOREIGN KEY (idappuser) REFERENCES tbl_app_user (id);
    END IF;
END
$$;

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- tbl_appvariable
CREATE TABLE IF NOT EXISTS tbl_appvariable (
    id SERIAL NOT NULL PRIMARY KEY,
	  nature TEXT,
    name TEXT,
    value DECIMAL(8,4),
    isdefault BOOLEAN,
    isactive BOOLEAN,
    iseditable BOOLEAN,
    isdeleted BOOLEAN
);

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- tbl_article
CREATE TABLE IF NOT EXISTS tbl_article (
    id SERIAL NOT NULL PRIMARY KEY,
	  reference TEXT,
    description TEXT,
    iswood BOOLEAN,
    unit TEXT,
    sellprice_ht DECIMAL(8,4),
    sellprice_ttc DECIMAL(8,4),
    lastpurchaseprice_ttc DECIMAL(8,4),
    creationdate TIMESTAMP,
    updatedate TIMESTAMP,
    minquantity DECIMAL(8,4),
    isdeleted BOOLEAN,
    profitmarginpercentage DECIMAL(5,2),
    lengths TEXT,
    idsellhistory INTEGER, -- History of sell price of the Article
    idtva INTEGER, -- Tva of the Article witch is an AppVariable
    idwidth INTEGER, -- Width of the Article witch is an AppVariable
    idthickness INTEGER, -- Thickness of the Article witch is an AppVariabale
    idcategory INTEGER, -- Category of the Article
    idsubcategory INTEGER, -- SubCategory of the Article
    idappuser INTEGER -- Person who updated this table (UpdatedBy)
);
-- tbl_sell_history : This table contains the history of created sell prices.
CREATE TABLE IF NOT EXISTS tbl_sell_history (
    id SERIAL NOT NULL PRIMARY KEY,
	  pricevalue DECIMAL(8,4),
    description TEXT,
    creationdate TIMESTAMP,
    updatedate TIMESTAMP,
    isdeleted BOOLEAN,
    idarticle INTEGER,
    idappuser INTEGER
);
    -- Add foreign key dependency if it does not already exist.
    -- Add foreign key constraints for idtva, idwidth, and idthickness referencing tbl_appvariable
    -- Add foreign key constraints for idappuser referencing tbl_app_user
    -- Add foreign key constraints for idcategory referencing tbl_parent
DO
$$
BEGIN
    -- Foreign key constraint for idtva
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_article_tbl_appvariable_idtva'
    )
    THEN
        ALTER TABLE tbl_article
        ADD CONSTRAINT fk_tbl_article_tbl_appvariable_idtva
        FOREIGN KEY (idtva) REFERENCES tbl_appvariable (id);
    END IF;

    -- Foreign key constraint for idwidth
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_article_tbl_appvariable_idwidth'
    )
    THEN
        ALTER TABLE tbl_article
        ADD CONSTRAINT fk_tbl_article_tbl_appvariable_idwidth
        FOREIGN KEY (idwidth) REFERENCES tbl_appvariable (id);
    END IF;

    -- Foreign key constraint for idthickness
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_article_tbl_appvariable_idthickness'
    )
    THEN
        ALTER TABLE tbl_article
        ADD CONSTRAINT fk_tbl_article_tbl_appvariable_idthickness
        FOREIGN KEY (idthickness) REFERENCES tbl_appvariable (id);
    END IF;

    -- Foreign key constraint for idappuser
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_article_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_article
        ADD CONSTRAINT fk_tbl_article_tbl_app_user
        FOREIGN KEY (idappuser) REFERENCES tbl_app_user (id);
    END IF;

    -- Foreign key constraint for idcategory
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_article_tbl_parent'
    )
    THEN
        ALTER TABLE tbl_article
        ADD CONSTRAINT fk_tbl_article_tbl_parent
        FOREIGN KEY (idcategory) REFERENCES tbl_parent (id);
    END IF;

     -- Foreign key constraint for idsubcategory
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_article_tbl_first_child'
    )
    THEN
        ALTER TABLE tbl_article
        ADD CONSTRAINT fk_tbl_article_tbl_first_child
        FOREIGN KEY (idsubcategory) REFERENCES tbl_first_child (id);
    END IF;

     -- Foreign key constraint for idsellhistory
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_article_tbl_sell_history'
    )
    THEN
        ALTER TABLE tbl_article
        ADD CONSTRAINT fk_tbl_article_tbl_sell_history
        FOREIGN KEY (idsellhistory) REFERENCES tbl_sell_history (id);
    END IF;
END
$$;

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- tbl_provider
CREATE TABLE IF NOT EXISTS tbl_provider (
    id SERIAL NOT NULL PRIMARY KEY,
	  prefix TEXT,
    name TEXT,
    description TEXT,
    representedbyname TEXT,
    representedbysurname TEXT,
    representedbyfullname TEXT,
    address TEXT,
    email TEXT,
    category TEXT,
    taxregistrationnumber TEXT,
    phonenumberone TEXT,
    phonenumbertwo TEXT,
    bankname TEXT,
    bankaccountnumber TEXT,
    creationdate TIMESTAMP, 
    updatedate TIMESTAMP,
    isactive BOOLEAN,
    isdeleted BOOLEAN,
    idappuser INTEGER -- Person who updated this table (UpdatedBy)
);
-- Add foreign key dependency if it does not already exist.
 -- tbl_provider > tbl_app_user
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_bank_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_bank
        ADD CONSTRAINT fk_tbl_bank_tbl_app_user
        FOREIGN KEY (idappuser) REFERENCES tbl_app_user (id);
    END IF;
END
$$;

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Create Tables Enterprise
CREATE TABLE IF NOT EXISTS tbl_enterprise (
    id SERIAL NOT NULL PRIMARY KEY,
    name TEXT,
    description TEXT,
    email TEXT,
    phone TEXT,
    mobileone TEXT,
    mobiletwo TEXT,
    enterpriseguid UUID,
    capital TEXT,
    matriculefiscal TEXT,
    commercialregister TEXT,
    siegeaddress TEXT,
    devise TEXT,
    nameresponsable TEXT,
    surnameresponsable TEXT,
    positionresponsable TEXT,
    issalingwood BOOLEAN
);



-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Create Tables sales_sites

CREATE TABLE IF NOT EXISTS tbl_sales_sites (
    id SERIAL NOT NULL PRIMARY KEY,
    isforsale BOOLEAN,
    gouvernorate TEXT,
    address TEXT,
    codepost TEXT,
    isdeleted BOOLEAN,
    enterpriseid INTEGER -- Foreign key to link with tbl_enterprise
);

-- Add foreign key dependency if it does not already exist.
 -- tbl_sales_sites > tbl_enterprise
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_sales_sites_tbl_enterprise'
    )
    THEN
        ALTER TABLE tbl_sales_sites
        ADD CONSTRAINT fk_tbl_sales_sites_tbl_enterprise
        FOREIGN KEY (enterpriseid) REFERENCES tbl_enterprise (id);
    END IF;
END
$$;

-- ============================================================================================
-- ============================================================================================
-- ============================================================================================

-- Create Table CounterPart

CREATE TABLE IF NOT EXISTS tbl_counter_part (
    id SERIAL NOT NULL PRIMARY KEY,
    guid UUID,
    type INTEGER,
    prefix TEXT,
    name TEXT,
    description TEXT,
    firstname TEXT,
    lastname TEXT,
    identitycardnumber TEXT,
    email TEXT,
    taxregistrationnumber TEXT,
    patentecode TEXT,
    address TEXT,
    gouvernorate TEXT,
    maximumdiscount DECIMAL(8,4),
    maximumsalesbar DECIMAL(10,4),
    notes TEXT,
    phonenumberone TEXT,
    phonenumbertwo TEXT,
    creationdate TIMESTAMP,
    updatedate TIMESTAMP,
    jobtitle TEXT,
    bankname TEXT,
    bankaccountnumber TEXT,
    isactive BOOLEAN,
    isdeleted BOOLEAN,
    updatedby INTEGER -- Foreign key to link with tbl_appuser
    transporterid INTEGER -- Foreign key to link with tbl_transporter
);

-- Add foreign key dependency if it does not already exist.
 -- tbl_conterpart > tbl_app_user
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_tbl_counter_part_tbl_app_user'
    )
    THEN
        ALTER TABLE tbl_counter_part
        ADD CONSTRAINT fk_tbl_counter_part_tbl_app_user
        FOREIGN KEY (updatedby) REFERENCES tbl_app_user (id);
    END IF;
END
$$;