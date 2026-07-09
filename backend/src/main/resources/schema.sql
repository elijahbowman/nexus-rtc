-- 1. Core Channels Inventory Table
CREATE TABLE IF NOT EXISTS channels (
                                        id BIGSERIAL PRIMARY KEY,
                                        name VARCHAR(50) NOT NULL UNIQUE, -- 🔒 Enforces strict uniqueness (e.g., no duplicate #general rooms)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- 2. Many-to-Many Junction Bridge (Tracks which users populate which chat spaces)
CREATE TABLE IF NOT EXISTS channel_members (
                                               channel_id BIGINT NOT NULL,
                                               user_id BIGINT NOT NULL,
                                               joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Composite Primary Key prevents a single user from joining the same channel twice
                                               PRIMARY KEY (channel_id, user_id),

    -- Foreign Key Constraints with Cascading Destruction
    CONSTRAINT fk_channel
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    CONSTRAINT fk_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Performance Indexes (Guarantees sub-millisecond retrieval speeds for large-scale queries)
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);
