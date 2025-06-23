-- CreateTable
CREATE TABLE "market_regime_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bot_id" UUID NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "regime_type" VARCHAR(20) NOT NULL,
    "strength" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "direction" VARCHAR(20) NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_regime_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_psychology_state" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bot_id" UUID NOT NULL,
    "emotional_state" VARCHAR(20) NOT NULL,
    "risk_tolerance" INTEGER NOT NULL,
    "stress_level" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "adaptability" INTEGER NOT NULL,
    "last_trade_impact" INTEGER NOT NULL,
    "recovery_mode" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_psychology_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_sizing_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bot_id" UUID NOT NULL,
    "position_size" DOUBLE PRECISION NOT NULL,
    "risk_amount" DOUBLE PRECISION NOT NULL,
    "confidence" INTEGER NOT NULL,
    "psychology_factor" DOUBLE PRECISION NOT NULL,
    "volatility_factor" DOUBLE PRECISION NOT NULL,
    "regime_factor" DOUBLE PRECISION NOT NULL,
    "performance_factor" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_sizing_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_performance" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bot_id" UUID NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "session_name" VARCHAR(20) NOT NULL,
    "is_overlap" BOOLEAN NOT NULL DEFAULT false,
    "volume" DOUBLE PRECISION NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "sentiment" VARCHAR(20) NOT NULL,
    "confidence" INTEGER NOT NULL,
    "liquidity" VARCHAR(20) NOT NULL,
    "spreads" VARCHAR(20) NOT NULL,
    "momentum" DOUBLE PRECISION NOT NULL,
    "recommendations" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_regime_history_bot_id_symbol_idx" ON "market_regime_history"("bot_id", "symbol");
CREATE INDEX "market_regime_history_timestamp_idx" ON "market_regime_history"("timestamp");

-- CreateIndex
CREATE INDEX "bot_psychology_state_bot_id_idx" ON "bot_psychology_state"("bot_id");
CREATE INDEX "bot_psychology_state_timestamp_idx" ON "bot_psychology_state"("timestamp");

-- CreateIndex
CREATE INDEX "position_sizing_log_bot_id_idx" ON "position_sizing_log"("bot_id");
CREATE INDEX "position_sizing_log_timestamp_idx" ON "position_sizing_log"("timestamp");

-- CreateIndex
CREATE INDEX "session_performance_bot_id_idx" ON "session_performance"("bot_id");
CREATE INDEX "session_performance_timestamp_idx" ON "session_performance"("timestamp");

-- AddForeignKey
ALTER TABLE "market_regime_history" ADD CONSTRAINT "market_regime_history_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_psychology_state" ADD CONSTRAINT "bot_psychology_state_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_sizing_log" ADD CONSTRAINT "position_sizing_log_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_performance" ADD CONSTRAINT "session_performance_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
