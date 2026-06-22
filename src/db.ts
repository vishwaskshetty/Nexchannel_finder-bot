import type {
  AdminState,
  AdminStateMode,
  AdminStats,
  Category,
  Channel,
  ChannelSearchOptions,
  ChannelStatus,
  ChannelType,
  Env,
  OwnerState,
  OwnerStateMode,
  Report,
  SearchSort,
  SearchState,
  Submission,
  SubmissionDraft,
  SubmitChannelInput,
  TelegramUser,
  VerificationStatus,
} from "./types";

const CHANNEL_SELECT = `
  ch.id,
  NULL AS category_id,
  cat.name AS category_name,
  cat.slug AS category_slug,
  ch.owner_telegram_id,
  ch.channel_type,
  ch.channel_username,
  ch.channel_link,
  ch.invite_link,
  CASE WHEN ch.channel_type = 'public' THEN ch.channel_username ELSE NULL END AS username,
  CASE
    WHEN ch.channel_type = 'private' THEN ch.invite_link
    WHEN ch.channel_link IS NOT NULL AND ch.channel_link != '' THEN ch.channel_link
    WHEN ch.channel_username IS NOT NULL AND ch.channel_username != '' THEN 'https://t.me/' || replace(ch.channel_username, '@', '')
    ELSE NULL
  END AS link,
  ch.title,
  ch.description,
  ch.category,
  ch.language,
  ch.tags,
  ch.admin_username,
  ch.status,
  ch.featured,
  ch.verified,
  ch.owner_verified,
  ch.verification_code,
  ch.verification_status,
  ch.verification_created_at,
  ch.join_clicks,
  ch.join_clicks AS clicks,
  ch.reports,
  ch.reports AS reports_count,
  ch.rating_total,
  ch.rating_count,
  ch.rating_average,
  ch.trending_score,
  ch.source_name,
  ch.source_url,
  ch.source_rank,
  ch.subscribers_text,
  ch.import_batch_id,
  ch.last_imported_at,
  ch.is_public_listing,
  ch.created_at,
  ch.updated_at
`;

export async function testDatabase(env: Env): Promise<{ ok: number } | null> {
  return env.DB.prepare("SELECT 1 as ok;").bind().first<{ ok: number }>();
}

export async function upsertUser(env: Env, user: TelegramUser): Promise<void> {
  await env.DB.prepare(
    `
    INSERT INTO users (telegram_id, username, first_name, last_seen_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_seen_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(user.id, user.username ?? null, user.first_name)
    .run();
}

export async function listCategories(env: Env): Promise<Category[]> {
  const result = await env.DB.prepare(
    "SELECT id, name, slug, sort_order, created_at FROM categories ORDER BY sort_order, name",
  ).all<Category>();

  return result.results ?? [];
}

export async function findCategoryBySlug(env: Env, slug: string): Promise<Category | null> {
  return env.DB.prepare(
    "SELECT id, name, slug, sort_order, created_at FROM categories WHERE slug = ?",
  )
    .bind(slug)
    .first<Category>();
}

export async function listChannelsByCategory(
  env: Env,
  slug: string,
  offset: number,
  limit: number,
): Promise<Channel[]> {
  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.category = ? AND ch.status = 'approved'
    ORDER BY ch.featured DESC, ch.verified DESC, ch.trending_score DESC, ch.created_at DESC
    LIMIT ? OFFSET ?
    `,
  )
    .bind(slug, limit, Math.max(0, offset))
    .all<Channel>();

  return result.results ?? [];
}

export async function listTopChannels(env: Env, limit = 10, offset = 0): Promise<Channel[]> {
  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.status = 'approved'
    ORDER BY ch.trending_score DESC, ch.rating_average DESC, ch.rating_count DESC, ch.join_clicks DESC
    LIMIT ? OFFSET ?
    `,
  )
    .bind(limit, Math.max(0, offset))
    .all<Channel>();

  return result.results ?? [];
}

export async function listNewChannels(env: Env, limit = 10, offset = 0): Promise<Channel[]> {
  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.status = 'approved'
    ORDER BY ch.created_at DESC
    LIMIT ? OFFSET ?
    `,
  )
    .bind(limit, Math.max(0, offset))
    .all<Channel>();

  return result.results ?? [];
}

export async function listFeaturedChannels(env: Env, limit = 10, offset = 0): Promise<Channel[]> {
  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.status = 'approved' AND ch.featured = 1
    ORDER BY ch.verified DESC, ch.trending_score DESC, ch.rating_average DESC, ch.created_at DESC
    LIMIT ? OFFSET ?
    `,
  )
    .bind(limit, Math.max(0, offset))
    .all<Channel>();

  return result.results ?? [];
}

export async function getChannel(env: Env, channelId: number): Promise<Channel | null> {
  return env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.id = ? AND ch.status = 'approved'
    `,
  )
    .bind(channelId)
    .first<Channel>();
}

export async function getAdminChannel(env: Env, channelId: number): Promise<Channel | null> {
  return env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.id = ?
    `,
  )
    .bind(channelId)
    .first<Channel>();
}

export async function listAdminChannelsByStatus(
  env: Env,
  status: ChannelStatus,
  limit = 1,
  offset = 0,
): Promise<Channel[]> {
  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.status = ?
    ORDER BY ch.created_at ASC
    LIMIT ? OFFSET ?
    `,
  )
    .bind(status, limit, Math.max(0, offset))
    .all<Channel>();

  return result.results ?? [];
}

export async function listAdminVerifiedChannels(env: Env, limit = 1): Promise<Channel[]> {
  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.verified = 1
    ORDER BY ch.status = 'approved' DESC, ch.updated_at DESC
    LIMIT ?
    `,
  )
    .bind(limit)
    .all<Channel>();

  return result.results ?? [];
}

export async function searchAdminChannels(
  env: Env,
  query: string,
  limit = 10,
): Promise<Channel[]> {
  const normalized = query.trim().toLowerCase();
  const like = `%${normalized}%`;
  const numericId = Number(normalized);
  const channelId = Number.isInteger(numericId) && numericId > 0 ? numericId : -1;

  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.id = ?
      OR lower(ch.title) LIKE ?
      OR lower(COALESCE(ch.channel_username, '')) LIKE ?
      OR lower(COALESCE(ch.channel_link, '')) LIKE ?
      OR lower(COALESCE(ch.invite_link, '')) LIKE ?
      OR lower(ch.description) LIKE ?
      OR lower(ch.category) LIKE ?
      OR lower(ch.language) LIKE ?
      OR lower(ch.tags) LIKE ?
      OR lower(COALESCE(ch.admin_username, '')) LIKE ?
    ORDER BY
      CASE ch.status
        WHEN 'pending' THEN 0
        WHEN 'approved' THEN 1
        WHEN 'hidden' THEN 2
        ELSE 3
      END,
      ch.updated_at DESC
    LIMIT ?
    `,
  )
    .bind(channelId, like, like, like, like, like, like, like, like, like, limit)
    .all<Channel>();

  return result.results ?? [];
}

export async function searchChannels(env: Env, options: ChannelSearchOptions): Promise<Channel[]> {
  const like = `%${options.query.trim().toLowerCase()}%`;
  const whereClauses = [
    "ch.status = 'approved'",
    `(
      lower(COALESCE(ch.channel_username, '')) LIKE ?
      OR lower(ch.title) LIKE ?
      OR lower(ch.description) LIKE ?
      OR lower(ch.category) LIKE ?
      OR lower(cat.name) LIKE ?
      OR lower(ch.language) LIKE ?
      OR lower(ch.tags) LIKE ?
    )`,
  ];
  const bindings: Array<string | number> = [like, like, like, like, like, like, like];

  if (options.language) {
    whereClauses.push("lower(ch.language) = lower(?)");
    bindings.push(options.language);
  }

  if (options.verifiedOnly) {
    whereClauses.push("ch.verified = 1");
  }

  bindings.push(options.limit, Math.max(0, options.offset));

  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ${whereClauses.join("\n      AND ")}
    ORDER BY ${searchOrderBy(options.sort)}
    LIMIT ? OFFSET ?
    `,
  )
    .bind(...bindings)
    .all<Channel>();

  return result.results ?? [];
}

export async function incrementChannelClicks(
  env: Env,
  channelId: number,
  telegramId?: number,
): Promise<void> {
  await env.DB.prepare(
    `
    UPDATE channels
    SET join_clicks = join_clicks + 1,
      trending_score = (((join_clicks + 1) * 2.0) + (rating_average * 10.0) + (rating_count * 2.0) - (reports * 10.0)),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
  )
    .bind(channelId)
    .run();

  if (telegramId) {
    await env.DB.prepare("INSERT INTO clicks (telegram_id, channel_id) VALUES (?, ?)")
      .bind(telegramId, channelId)
      .run();
  }
}

export async function rateChannel(
  env: Env,
  telegramId: number,
  channelId: number,
  rating: number,
): Promise<"created" | "exists" | "missing" | "invalid"> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "invalid";
  }

  const channel = await getChannel(env, channelId);
  if (!channel) {
    return "missing";
  }

  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO ratings (telegram_id, channel_id, rating) VALUES (?, ?, ?)",
  )
    .bind(telegramId, channelId, rating)
    .run();

  if (result.meta.changes === 0) {
    return "exists";
  }

  await env.DB.prepare(
    `
    UPDATE channels
    SET rating_total = rating_total + ?,
      rating_count = rating_count + 1,
      rating_average = ROUND(((rating_total + ?) * 1.0) / (rating_count + 1), 1),
      trending_score = (
        (join_clicks * 2.0)
        + (ROUND(((rating_total + ?) * 1.0) / (rating_count + 1), 1) * 10.0)
        + ((rating_count + 1) * 2.0)
        - (reports * 10.0)
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
  )
    .bind(rating, rating, rating, channelId)
    .run();

  return "created";
}

export async function isChannelSaved(
  env: Env,
  telegramId: number,
  channelId: number,
): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT id FROM saved_channels WHERE telegram_id = ? AND channel_id = ? LIMIT 1",
  )
    .bind(telegramId, channelId)
    .first<{ id: number }>();

  return Boolean(row);
}

export async function saveChannel(
  env: Env,
  telegramId: number,
  channelId: number,
): Promise<"created" | "exists" | "missing"> {
  const channel = await getChannel(env, channelId);
  if (!channel) {
    return "missing";
  }

  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO saved_channels (telegram_id, channel_id) VALUES (?, ?)",
  )
    .bind(telegramId, channelId)
    .run();

  return result.meta.changes === 0 ? "exists" : "created";
}

export async function removeSavedChannel(
  env: Env,
  telegramId: number,
  channelId: number,
): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM saved_channels WHERE telegram_id = ? AND channel_id = ?",
  )
    .bind(telegramId, channelId)
    .run();

  return result.meta.changes > 0;
}

export async function listSavedChannels(
  env: Env,
  telegramId: number,
  offset: number,
  limit: number,
): Promise<Channel[]> {
  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM saved_channels saved
    JOIN channels ch ON ch.id = saved.channel_id
    JOIN categories cat ON cat.slug = ch.category
    WHERE saved.telegram_id = ? AND ch.status = 'approved'
    ORDER BY saved.created_at DESC
    LIMIT ? OFFSET ?
    `,
  )
    .bind(telegramId, limit, Math.max(0, offset))
    .all<Channel>();

  return result.results ?? [];
}

export async function listWeeklyLeaderboard(
  env: Env,
  limit = 3,
  order: "score" | "rating" | "clicks" | "new" = "score",
): Promise<Channel[]> {
  const result = await env.DB.prepare(
    `
    WITH weekly_clicks AS (
      SELECT channel_id, COUNT(*) AS weekly_clicks
      FROM clicks
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY channel_id
    ),
    weekly_ratings AS (
      SELECT channel_id, AVG(rating) AS weekly_rating_average, COUNT(*) AS weekly_rating_count
      FROM ratings
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY channel_id
    )
    SELECT
      ${CHANNEL_SELECT},
      COALESCE(weekly_clicks.weekly_clicks, 0) AS weekly_clicks,
      ROUND(COALESCE(weekly_ratings.weekly_rating_average, 0), 1) AS weekly_rating_average,
      COALESCE(weekly_ratings.weekly_rating_count, 0) AS weekly_rating_count,
      (
        COALESCE(weekly_clicks.weekly_clicks, 0) * 2.0
        + ROUND(COALESCE(weekly_ratings.weekly_rating_average, 0), 1) * 10.0
        + COALESCE(weekly_ratings.weekly_rating_count, 0) * 2.0
        - ch.reports * 10.0
      ) AS weekly_score
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    LEFT JOIN weekly_clicks ON weekly_clicks.channel_id = ch.id
    LEFT JOIN weekly_ratings ON weekly_ratings.channel_id = ch.id
    WHERE ch.status = 'approved'
    ORDER BY ${weeklyLeaderboardOrder(order)}
    LIMIT ?
    `,
  )
    .bind(limit)
    .all<Channel>();

  return result.results ?? [];
}

export async function listLeaderboardFallback(env: Env, limit = 3): Promise<Channel[]> {
  return listTopChannels(env, limit);
}

export async function createOwnershipVerification(
  env: Env,
  telegramId: number,
  channelId: number,
): Promise<string> {
  const code = verificationCode();

  await env.DB.prepare(
    `
    UPDATE channels
    SET verification_code = ?,
      verification_status = 'pending',
      verification_created_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND owner_telegram_id = ?
    `,
  )
    .bind(code, channelId, telegramId)
    .run();

  await env.DB.prepare(
    `
    INSERT INTO ownership_verifications (
      telegram_id,
      channel_id,
      verification_code,
      status,
      method,
      created_at
    )
    VALUES (?, ?, ?, 'pending', 'auto', CURRENT_TIMESTAMP)
    `,
  )
    .bind(telegramId, channelId, code)
    .run();

  return code;
}

export async function getLatestOwnershipVerificationChannelId(
  env: Env,
  telegramId: number,
): Promise<number | null> {
  const row = await env.DB.prepare(
    `
    SELECT channel_id
    FROM ownership_verifications
    WHERE telegram_id = ? AND status IN ('pending', 'manual_review')
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
  )
    .bind(telegramId)
    .first<{ channel_id: number }>();

  return row?.channel_id ?? null;
}

export async function markOwnershipVerificationStatus(
  env: Env,
  telegramId: number,
  channelId: number,
  status: VerificationStatus,
  method: string,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `
      UPDATE channels
      SET owner_verified = CASE WHEN ? = 'verified' THEN 1 ELSE owner_verified END,
        verification_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND owner_telegram_id = ?
      `,
    ).bind(status, status, channelId, telegramId),
    env.DB.prepare(
      `
      UPDATE ownership_verifications
      SET status = ?,
        method = ?,
        verified_at = CASE WHEN ? = 'verified' THEN CURRENT_TIMESTAMP ELSE verified_at END
      WHERE channel_id = ? AND telegram_id = ?
      `,
    ).bind(status, method, status, channelId, telegramId),
  ]);
}

export async function markChannelOwnerVerified(env: Env, channelId: number): Promise<Channel | null> {
  const channel = await getAdminChannel(env, channelId);
  if (!channel) {
    return null;
  }

  await env.DB.batch([
    env.DB.prepare(
      `
      UPDATE channels
      SET owner_verified = 1,
        verification_status = 'verified',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
    ).bind(channelId),
    env.DB.prepare(
      `
      UPDATE ownership_verifications
      SET status = 'verified',
        method = 'admin',
        verified_at = CURRENT_TIMESTAMP
      WHERE channel_id = ?
      `,
    ).bind(channelId),
  ]);

  return getAdminChannel(env, channelId);
}

export async function createSubmission(env: Env, input: SubmitChannelInput): Promise<number> {
  const isPrivate = input.channelType === "private";

  const safeChannelUsername = isPrivate
    ? ""
    : normalizeTelegramUsername(input.channelUsername || input.channelLink || input.channelIdentifier || "");

  const safeChannelLink = isPrivate
    ? ""
    : input.channelLink || (safeChannelUsername ? publicLinkFromUsername(safeChannelUsername) : "");

  const safeInviteLink = isPrivate ? input.inviteLink || input.channelIdentifier || "" : "";

  console.log("Final channel insert values:", {
    channel_type: input.channelType,
    channel_username: safeChannelUsername,
    channel_link: safeChannelLink,
    invite_link: safeInviteLink ? "PRIVATE_LINK_SET" : "",
  });

  const result = await env.DB.prepare(
    `
    INSERT INTO channels (
      owner_telegram_id,
      channel_type,
      channel_username,
      channel_link,
      invite_link,
      title,
      description,
      category,
      language,
      tags,
      admin_username,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `,
  )
    .bind(
      input.userId,
      input.channelType,
      safeChannelUsername,
      safeChannelLink,
      safeInviteLink,
      titleFromIdentifier(input.channelIdentifier, input.channelType),
      input.description,
      input.categorySlug,
      input.language,
      input.tags,
      input.adminUsername,
    )
    .run();

  return Number(result.meta.last_row_id);
}

export async function getSubmissionDraft(
  env: Env,
  telegramId: number,
): Promise<SubmissionDraft | null> {
  return env.DB.prepare(
    `
    SELECT
      telegram_id,
      step,
      channel_type,
      channel_username,
      category,
      language,
      description,
      tags,
      admin_username,
      updated_at
    FROM submissions
    WHERE telegram_id = ?
    `,
  )
    .bind(telegramId)
    .first<SubmissionDraft>();
}

export async function startSubmissionDraft(env: Env, telegramId: number): Promise<void> {
  await env.DB.prepare(
    `
    INSERT INTO submissions (telegram_id, step, channel_type, channel_username, updated_at)
    VALUES (?, 'type', NULL, NULL, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_id) DO UPDATE SET
      step = 'type',
      channel_type = NULL,
      channel_username = NULL,
      category = NULL,
      language = NULL,
      description = NULL,
      tags = NULL,
      admin_username = NULL,
      updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(telegramId)
    .run();
}

export async function updateSubmissionDraft(
  env: Env,
  telegramId: number,
  fields: Partial<Omit<SubmissionDraft, "telegram_id" | "updated_at">>,
): Promise<void> {
  const draft = await getSubmissionDraft(env, telegramId);
  const next = {
    step: fields.step ?? draft?.step ?? "type",
    channel_type: fields.channel_type ?? draft?.channel_type ?? null,
    channel_username: fields.channel_username ?? draft?.channel_username ?? null,
    category: fields.category ?? draft?.category ?? null,
    language: fields.language ?? draft?.language ?? null,
    description: fields.description ?? draft?.description ?? null,
    tags: fields.tags ?? draft?.tags ?? null,
    admin_username: fields.admin_username ?? draft?.admin_username ?? null,
  };

  await env.DB.prepare(
    `
    INSERT INTO submissions (
      telegram_id,
      step,
      channel_type,
      channel_username,
      category,
      language,
      description,
      tags,
      admin_username,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_id) DO UPDATE SET
      step = excluded.step,
      channel_type = excluded.channel_type,
      channel_username = excluded.channel_username,
      category = excluded.category,
      language = excluded.language,
      description = excluded.description,
      tags = excluded.tags,
      admin_username = excluded.admin_username,
      updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(
      telegramId,
      next.step,
      next.channel_type,
      next.channel_username,
      next.category,
      next.language,
      next.description,
      next.tags,
      next.admin_username,
    )
    .run();
}

export async function clearSubmissionDraft(env: Env, telegramId: number): Promise<void> {
  await env.DB.prepare("DELETE FROM submissions WHERE telegram_id = ?")
    .bind(telegramId)
    .run();
}

export async function findChannelByIdentifier(
  env: Env,
  identifier: string,
): Promise<Pick<Channel, "id" | "status"> | null> {
  const value = identifier.trim();

  return env.DB.prepare(
    `
    SELECT id, status
    FROM channels
    WHERE lower(COALESCE(channel_username, '')) = lower(?)
      OR lower(COALESCE(channel_link, '')) = lower(?)
      OR lower(COALESCE(invite_link, '')) = lower(?)
    LIMIT 1
    `,
  )
    .bind(value, value, value)
    .first<Pick<Channel, "id" | "status">>();
}

export async function listPendingSubmissions(env: Env, limit = 10): Promise<Submission[]> {
  const result = await env.DB.prepare(
    `
    SELECT ${SUBMISSION_SELECT}
    FROM channels
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ?
    `,
  )
    .bind(limit)
    .all<Submission>();

  return result.results ?? [];
}

export async function getSubmission(env: Env, submissionId: number): Promise<Submission | null> {
  return env.DB.prepare(
    `
    SELECT ${SUBMISSION_SELECT}
    FROM channels
    WHERE id = ?
    `,
  )
    .bind(submissionId)
    .first<Submission>();
}

export async function approveSubmission(
  env: Env,
  submissionId: number,
  adminId: number,
): Promise<Submission | null> {
  const submission = await getSubmission(env, submissionId);
  if (!submission || submission.status !== "pending") {
    return null;
  }

  await setChannelStatus(env, submissionId, "approved");

  void adminId;
  return submission;
}

export async function rejectSubmission(
  env: Env,
  submissionId: number,
  adminId: number,
  note = "Rejected by admin",
): Promise<Submission | null> {
  const submission = await getSubmission(env, submissionId);
  if (!submission || submission.status !== "pending") {
    return null;
  }

  await setChannelStatus(env, submissionId, "rejected");

  void adminId;
  void note;
  return submission;
}

export async function hideSubmission(
  env: Env,
  submissionId: number,
  adminId: number,
): Promise<Submission | null> {
  const submission = await getSubmission(env, submissionId);
  if (!submission || submission.status !== "pending") {
    return null;
  }

  await setChannelStatus(env, submissionId, "hidden");

  void adminId;
  return submission;
}

export async function setChannelStatus(
  env: Env,
  channelId: number,
  status: ChannelStatus,
): Promise<Channel | null> {
  const channel = await getAdminChannel(env, channelId);
  if (!channel) {
    return null;
  }

  await env.DB.prepare(
    `
    UPDATE channels
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
  )
    .bind(status, channelId)
    .run();

  return channel;
}

export async function markChannelVerified(env: Env, channelId: number): Promise<Channel | null> {
  const channel = await getAdminChannel(env, channelId);
  if (!channel) {
    return null;
  }

  await env.DB.prepare(
    `
    UPDATE channels
    SET verified = 1,
      status = CASE WHEN status = 'pending' THEN 'approved' ELSE status END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
  )
    .bind(channelId)
    .run();

  return getAdminChannel(env, channelId);
}

export async function markChannelUnverified(env: Env, channelId: number): Promise<Channel | null> {
  const channel = await getAdminChannel(env, channelId);
  if (!channel) {
    return null;
  }

  await env.DB.prepare(
    `
    UPDATE channels
    SET verified = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
  )
    .bind(channelId)
    .run();

  return getAdminChannel(env, channelId);
}

export async function removeChannel(env: Env, channelId: number): Promise<Channel | null> {
  const channel = await getAdminChannel(env, channelId);
  if (!channel) {
    return null;
  }

  await env.DB.prepare("DELETE FROM channels WHERE id = ?")
    .bind(channelId)
    .run();

  return channel;
}

export async function listUserChannels(
  env: Env,
  userId: number,
  offset = 0,
  limit = 10,
): Promise<Channel[]> {
  const result = await env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.owner_telegram_id = ? AND ch.status = 'approved'
    ORDER BY ch.updated_at DESC, ch.created_at DESC
    LIMIT ? OFFSET ?
    `,
  )
    .bind(userId, limit, Math.max(0, offset))
    .all<Channel>();

  return result.results ?? [];
}

export async function getUserChannel(
  env: Env,
  userId: number,
  channelId: number,
): Promise<Channel | null> {
  return env.DB.prepare(
    `
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    JOIN categories cat ON cat.slug = ch.category
    WHERE ch.owner_telegram_id = ? AND ch.id = ?
    `,
  )
    .bind(userId, channelId)
    .first<Channel>();
}

export async function hideUserChannel(
  env: Env,
  userId: number,
  channelId: number,
): Promise<Channel | null> {
  const channel = await getUserChannel(env, userId, channelId);
  if (!channel) {
    return null;
  }

  await env.DB.prepare(
    `
    UPDATE channels
    SET status = 'hidden', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND owner_telegram_id = ?
    `,
  )
    .bind(channelId, userId)
    .run();

  return getUserChannel(env, userId, channelId);
}

export async function updateUserChannelDetails(
  env: Env,
  userId: number,
  channelId: number,
  fields: {
    description?: string;
    tags?: string;
    category?: string;
    language?: string;
  },
): Promise<Channel | null> {
  const updates: string[] = [];
  const values: Array<string | number> = [];

  if (fields.description !== undefined) {
    updates.push("description = ?");
    values.push(fields.description);
  }

  if (fields.tags !== undefined) {
    updates.push("tags = ?");
    values.push(fields.tags);
  }

  if (fields.category !== undefined) {
    updates.push("category = ?");
    values.push(fields.category);
  }

  if (fields.language !== undefined) {
    updates.push("language = ?");
    values.push(fields.language);
  }

  if (updates.length === 0) {
    return getUserChannel(env, userId, channelId);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(channelId, userId);

  await env.DB.prepare(
    `
    UPDATE channels
    SET ${updates.join(", ")}
    WHERE id = ? AND owner_telegram_id = ?
    `,
  )
    .bind(...values)
    .run();

  return getUserChannel(env, userId, channelId);
}

export async function getOwnerState(env: Env, telegramId: number): Promise<OwnerState | null> {
  return env.DB.prepare(
    `
    SELECT telegram_id, channel_id, mode, updated_at
    FROM owner_states
    WHERE telegram_id = ?
    `,
  )
    .bind(telegramId)
    .first<OwnerState>();
}

export async function setOwnerState(
  env: Env,
  telegramId: number,
  channelId: number,
  mode: OwnerStateMode,
): Promise<void> {
  await env.DB.prepare(
    `
    INSERT INTO owner_states (telegram_id, channel_id, mode, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      mode = excluded.mode,
      updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(telegramId, channelId, mode)
    .run();
}

export async function clearOwnerState(env: Env, telegramId: number): Promise<void> {
  await env.DB.prepare("DELETE FROM owner_states WHERE telegram_id = ?")
    .bind(telegramId)
    .run();
}

export type CreateReportResult =
  | { status: "created"; id: number; channelHidden: boolean }
  | { status: "exists" };

export async function createReport(
  env: Env,
  userId: number | null,
  channelId: number | null,
  reason: string,
): Promise<CreateReportResult> {
  if (!channelId) {
    throw new Error("A channel ID is required for reports.");
  }

  if (userId) {
    const fingerprint = await env.DB.prepare(
      `
      INSERT OR IGNORE INTO report_fingerprints (telegram_id, channel_id)
      VALUES (?, ?)
      `,
    )
      .bind(userId, channelId)
      .run();

    if (fingerprint.meta.changes === 0) {
      return { status: "exists" };
    }
  }

  try {
    const [insertResult] = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO reports (telegram_id, channel_id, reason) VALUES (?, ?, ?)",
      ).bind(userId, channelId, reason),
      env.DB.prepare(
        `
        UPDATE channels
        SET reports = reports + 1,
          status = CASE WHEN reports + 1 >= 5 THEN 'hidden' ELSE status END,
          trending_score = ((join_clicks * 2.0) + (rating_average * 10.0) + (rating_count * 2.0) - ((reports + 1) * 10.0)),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
      ).bind(channelId),
    ]);

    const channel = await getAdminChannel(env, channelId);
    return {
      status: "created",
      id: Number(insertResult.meta.last_row_id),
      channelHidden: channel?.status === "hidden",
    };
  } catch (error) {
    if (userId) {
      await env.DB.prepare(
        "DELETE FROM report_fingerprints WHERE telegram_id = ? AND channel_id = ?",
      )
        .bind(userId, channelId)
        .run();
    }
    throw error;
  }
}

export async function listOpenReports(env: Env, limit = 10): Promise<Report[]> {
  const result = await env.DB.prepare(
    `
    SELECT
      id,
      telegram_id AS user_id,
      channel_id,
      reason,
      'open' AS status,
      created_at,
      NULL AS resolved_at
    FROM reports
    ORDER BY created_at ASC
    LIMIT ?
    `,
  )
    .bind(limit)
    .all<Report>();

  return result.results ?? [];
}

export async function resolveReport(env: Env, reportId: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM reports WHERE id = ?")
    .bind(reportId)
    .run();

  return result.meta.changes > 0;
}

export async function getAdminStats(env: Env): Promise<AdminStats> {
  const [
    totalUsers,
    totalChannels,
    pendingChannels,
    approvedChannels,
    hiddenChannels,
    verifiedChannels,
    totalSaved,
    totalRatings,
    totalClicks,
    totalReports,
  ] = await Promise.all([
    countRows(env, "users"),
    countRows(env, "channels"),
    countRows(env, "channels", "status = 'pending'"),
    countRows(env, "channels", "status = 'approved'"),
    countRows(env, "channels", "status = 'hidden'"),
    countRows(env, "channels", "verified = 1"),
    countRows(env, "saved_channels"),
    sumColumn(env, "channels", "rating_count"),
    sumColumn(env, "channels", "join_clicks"),
    sumColumn(env, "channels", "reports"),
  ]);

  return {
    totalUsers,
    totalChannels,
    pendingChannels,
    approvedChannels,
    hiddenChannels,
    verifiedChannels,
    totalSaved,
    totalRatings,
    totalClicks,
    totalReports,
  };
}

export async function listBroadcastUsers(env: Env): Promise<number[]> {
  const result = await env.DB.prepare(
    "SELECT telegram_id FROM users ORDER BY created_at ASC",
  ).all<{ telegram_id: number }>();

  return (result.results ?? []).map((row) => row.telegram_id);
}

export async function getAdminState(env: Env, telegramId: number): Promise<AdminState | null> {
  return env.DB.prepare(
    `
    SELECT telegram_id, mode, payload, updated_at
    FROM admin_states
    WHERE telegram_id = ?
    `,
  )
    .bind(telegramId)
    .first<AdminState>();
}

export async function setAdminState(
  env: Env,
  telegramId: number,
  mode: AdminStateMode,
  payload: string | null = null,
): Promise<void> {
  await env.DB.prepare(
    `
    INSERT INTO admin_states (telegram_id, mode, payload, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_id) DO UPDATE SET
      mode = excluded.mode,
      payload = excluded.payload,
      updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(telegramId, mode, payload)
    .run();
}

export async function clearAdminState(env: Env, telegramId: number): Promise<void> {
  await env.DB.prepare("DELETE FROM admin_states WHERE telegram_id = ?")
    .bind(telegramId)
    .run();
}

export async function getSearchState(env: Env, telegramId: number): Promise<SearchState | null> {
  return env.DB.prepare(
    `
    SELECT telegram_id, query, sort, language, verified_only, updated_at
    FROM search_states
    WHERE telegram_id = ?
    `,
  )
    .bind(telegramId)
    .first<SearchState>();
}

export async function setSearchState(
  env: Env,
  telegramId: number,
  state: {
    query: string;
    sort: SearchSort;
    language?: string | null;
    verifiedOnly?: boolean;
  },
): Promise<void> {
  await env.DB.prepare(
    `
    INSERT INTO search_states (telegram_id, query, sort, language, verified_only, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_id) DO UPDATE SET
      query = excluded.query,
      sort = excluded.sort,
      language = excluded.language,
      verified_only = excluded.verified_only,
      updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(
      telegramId,
      state.query,
      state.sort,
      state.language ?? null,
      state.verifiedOnly ? 1 : 0,
    )
    .run();
}

const SUBMISSION_SELECT = `
  id,
  owner_telegram_id AS user_id,
  category AS category_slug,
  title,
  CASE WHEN channel_type = 'public' THEN channel_username ELSE NULL END AS username,
  CASE
    WHEN channel_type = 'private' THEN invite_link
    WHEN channel_link IS NOT NULL AND channel_link != '' THEN channel_link
    WHEN channel_username IS NOT NULL AND channel_username != '' THEN 'https://t.me/' || replace(channel_username, '@', '')
    ELSE NULL
  END AS link,
  channel_type,
  description,
  language,
  tags,
  admin_username,
  owner_verified,
  verification_code,
  verification_status,
  status,
  NULL AS reviewed_by,
  NULL AS admin_note,
  created_at,
  NULL AS reviewed_at
`;

async function countRows(env: Env, table: string, whereClause?: string): Promise<number> {
  const sql = `SELECT COUNT(*) AS value FROM ${table}${whereClause ? ` WHERE ${whereClause}` : ""}`;
  const row = await env.DB.prepare(sql).first<{ value: number }>();
  return row?.value ?? 0;
}

async function sumColumn(
  env: Env,
  table: string,
  column: string,
  whereClause?: string,
): Promise<number> {
  const sql = `SELECT COALESCE(SUM(${column}), 0) AS value FROM ${table}${whereClause ? ` WHERE ${whereClause}` : ""}`;
  const row = await env.DB.prepare(sql).first<{ value: number }>();
  return row?.value ?? 0;
}

function searchOrderBy(sort: SearchSort): string {
  switch (sort) {
    case "rating":
      return "ch.rating_average DESC, ch.rating_count DESC, ch.trending_score DESC, ch.created_at DESC";
    case "clicks":
      return "ch.join_clicks DESC, ch.trending_score DESC, ch.created_at DESC";
    case "newest":
      return "ch.created_at DESC";
    case "trending":
    default:
      return "ch.trending_score DESC, ch.rating_average DESC, ch.rating_count DESC, ch.join_clicks DESC, ch.created_at DESC";
  }
}

function weeklyLeaderboardOrder(order: "score" | "rating" | "clicks" | "new"): string {
  switch (order) {
    case "rating":
      return "weekly_rating_average DESC, weekly_rating_count DESC, ch.rating_average DESC, ch.rating_count DESC, ch.trending_score DESC";
    case "clicks":
      return "weekly_clicks DESC, ch.join_clicks DESC, ch.trending_score DESC";
    case "new":
      return "ch.created_at DESC, ch.trending_score DESC";
    case "score":
    default:
      return "weekly_score DESC, weekly_clicks DESC, weekly_rating_count DESC, ch.trending_score DESC";
  }
}

function verificationCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return `NEX-${10000 + (values[0] % 90000)}`;
}

function normalizeTelegramUsername(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("@")) {
    return trimmed;
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (/^t\.me\//i.test(withoutProtocol) || /^telegram\.me\//i.test(withoutProtocol)) {
    const path = withoutProtocol
      .replace(/^t\.me\//i, "")
      .replace(/^telegram\.me\//i, "")
      .split(/[/?#]/, 1)[0];

    if (path && !path.startsWith("+") && path !== "joinchat") {
      return `@${path}`;
    }
  }

  return `@${trimmed.replace(/^@/, "")}`;
}

function titleFromIdentifier(identifier: string, channelType: ChannelType): string {
  if (channelType === "private") {
    return "Private Channel";
  }

  return identifier
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^@/, "")
    .replace(/_/g, " ")
    .trim();
}

function publicLinkFromUsername(username: string): string {
  return `https://t.me/${username.replace(/^@/, "")}`;
}

// ─── YouTube Verification ────────────────────────────────────────────────────

import type { YoutubeVerification, YoutubeVerificationStatus } from "./types";

export async function getYoutubeVerification(
  env: Env,
  telegramId: number,
): Promise<YoutubeVerification | null> {
  return env.DB.prepare(
    `SELECT telegram_id, status, proof_file_id, clicked_at, submitted_at, approved_at, rejected_at, updated_at
     FROM youtube_verifications WHERE telegram_id = ?`,
  )
    .bind(telegramId)
    .first<YoutubeVerification>();
}

export async function upsertYoutubeVerification(
  env: Env,
  telegramId: number,
): Promise<YoutubeVerification | null> {
  await env.DB.prepare(
    `INSERT INTO youtube_verifications (telegram_id, status, updated_at)
     VALUES (?, 'not_started', CURRENT_TIMESTAMP)
     ON CONFLICT(telegram_id) DO NOTHING`,
  )
    .bind(telegramId)
    .run();

  return getYoutubeVerification(env, telegramId);
}

export async function setYoutubeClicked(
  env: Env,
  telegramId: number,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO youtube_verifications (telegram_id, status, clicked_at, updated_at)
     VALUES (?, 'clicked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(telegram_id) DO UPDATE SET
       status = 'clicked',
       clicked_at = COALESCE(clicked_at, CURRENT_TIMESTAMP),
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(telegramId)
    .run();
}

export async function setYoutubePendingPhoto(
  env: Env,
  telegramId: number,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE youtube_verifications
     SET status = 'pending_photo', updated_at = CURRENT_TIMESTAMP
     WHERE telegram_id = ?`,
  )
    .bind(telegramId)
    .run();
}

export async function setYoutubeProofSubmitted(
  env: Env,
  telegramId: number,
  fileId: string,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE youtube_verifications
     SET status = 'pending', proof_file_id = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE telegram_id = ?`,
  )
    .bind(fileId, telegramId)
    .run();
}

export async function setYoutubeApproved(
  env: Env,
  telegramId: number,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE youtube_verifications
       SET status = 'approved', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = ?`,
    ).bind(telegramId),
    env.DB.prepare(
      `UPDATE users SET youtube_verified = 1 WHERE telegram_id = ?`,
    ).bind(telegramId),
  ]);
}

export async function setYoutubeRejected(
  env: Env,
  telegramId: number,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE youtube_verifications
       SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = ?`,
    ).bind(telegramId),
    env.DB.prepare(
      `UPDATE users SET youtube_verified = 0 WHERE telegram_id = ?`,
    ).bind(telegramId),
  ]);
}

export async function resetYoutubeVerification(
  env: Env,
  telegramId: number,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO youtube_verifications (telegram_id, status, updated_at)
       VALUES (?, 'not_started', CURRENT_TIMESTAMP)
       ON CONFLICT(telegram_id) DO UPDATE SET
         status = 'not_started', proof_file_id = NULL, clicked_at = NULL,
         submitted_at = NULL, approved_at = NULL, rejected_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(telegramId),
    env.DB.prepare(
      `UPDATE users SET youtube_verified = 0 WHERE telegram_id = ?`,
    ).bind(telegramId),
  ]);
}

export async function isUserYoutubeVerified(
  env: Env,
  telegramId: number,
): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT youtube_verified FROM users WHERE telegram_id = ?`,
  )
    .bind(telegramId)
    .first<{ youtube_verified: number }>();

  return (row?.youtube_verified ?? 0) === 1;
}

export async function setYoutubeRetry(
  env: Env,
  telegramId: number,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE youtube_verifications
     SET status = 'clicked', proof_file_id = NULL, submitted_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE telegram_id = ?`,
  )
    .bind(telegramId)
    .run();
}

// ─── Import System ──────────────────────────────────────────────────────────

export async function createImportBatch(
  env: Env,
  id: string,
  sourceName: string,
  sourceUrl: string,
  importedBy: number
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO channel_import_batches (id, source_name, source_url, imported_by)
     VALUES (?, ?, ?, ?)`
  ).bind(id, sourceName, sourceUrl, importedBy).run();
}

export async function updateImportBatchStats(
  env: Env,
  id: string,
  totalFound: number,
  totalImported: number,
  totalSkipped: number
): Promise<void> {
  await env.DB.prepare(
    `UPDATE channel_import_batches
     SET total_found = ?, total_imported = ?, total_skipped = ?
     WHERE id = ?`
  ).bind(totalFound, totalImported, totalSkipped, id).run();
}

export async function logImportSkip(
  env: Env,
  batchId: string,
  title: string,
  username: string,
  externalCategory: string,
  reason: string
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO channel_import_skips (batch_id, title, username, external_category, reason)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(batchId, title, username, externalCategory, reason).run();
}

export interface ImportChannelData {
  owner_telegram_id: number;
  channel_type: ChannelType;
  channel_username: string;
  channel_link: string;
  invite_link: string;
  title: string;
  description: string;
  category: string;
  language: string;
  tags: string;
  admin_username: string;
  status: ChannelStatus;
  source_name: string;
  source_url: string;
  source_rank: number;
  subscribers_text: string;
  import_batch_id: string;
}

export async function importChannel(
  env: Env,
  data: ImportChannelData
): Promise<boolean> {
  if (data.channel_type === 'private') {
    try {
      await env.DB.prepare(
        `INSERT INTO channels (
           owner_telegram_id, channel_type, channel_username, channel_link, invite_link,
           title, description, category, language, tags, admin_username, status,
           source_name, source_url, source_rank, subscribers_text, import_batch_id,
           last_imported_at, is_public_listing, featured, verified
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0, 0, 0)`
      ).bind(
        data.owner_telegram_id, data.channel_type, data.channel_username, data.channel_link, data.invite_link,
        data.title, data.description, data.category, data.language, data.tags, data.admin_username, data.status,
        data.source_name, data.source_url, data.source_rank, data.subscribers_text, data.import_batch_id
      ).run();
      return true; // Inserted
    } catch (e) {
      console.warn("Private import failed (duplicate link?):", e);
      return false;
    }
  }

  // Public channel: upsert by channel_username
  const existing = await env.DB.prepare(
    `SELECT id FROM channels WHERE channel_username = ? COLLATE NOCASE`
  ).bind(data.channel_username).first<{id: number}>();

  if (existing) {
    await env.DB.prepare(
      `UPDATE channels SET
         title = ?, category = ?, language = ?, subscribers_text = ?,
         source_rank = ?, last_imported_at = CURRENT_TIMESTAMP, import_batch_id = ?
       WHERE id = ?`
    ).bind(
      data.title, data.category, data.language, data.subscribers_text,
      data.source_rank, data.import_batch_id, existing.id
    ).run();
    return false; // Updated
  } else {
    await env.DB.prepare(
      `INSERT INTO channels (
         owner_telegram_id, channel_type, channel_username, channel_link, invite_link,
         title, description, category, language, tags, admin_username, status,
         source_name, source_url, source_rank, subscribers_text, import_batch_id,
         last_imported_at, is_public_listing, featured, verified
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, 0, 0)`
    ).bind(
      data.owner_telegram_id, data.channel_type, data.channel_username, data.channel_link, data.invite_link,
      data.title, data.description, data.category, data.language, data.tags, data.admin_username, data.status,
      data.source_name, data.source_url, data.source_rank, data.subscribers_text, data.import_batch_id
    ).run();
    return true; // Inserted
  }
}

export async function getImportStats(env: Env) {
  const [total, publicCh, privateCh, approvedCh, pendingCh, skips, lastBatch] = await Promise.all([
    env.DB.prepare(`SELECT count(*) as c FROM channels`).first<{c: number}>(),
    env.DB.prepare(`SELECT count(*) as c FROM channels WHERE channel_type = 'public'`).first<{c: number}>(),
    env.DB.prepare(`SELECT count(*) as c FROM channels WHERE channel_type = 'private'`).first<{c: number}>(),
    env.DB.prepare(`SELECT count(*) as c FROM channels WHERE status = 'approved'`).first<{c: number}>(),
    env.DB.prepare(`SELECT count(*) as c FROM channels WHERE status = 'pending'`).first<{c: number}>(),
    env.DB.prepare(`SELECT count(*) as c FROM channel_import_skips`).first<{c: number}>(),
    env.DB.prepare(`SELECT total_found, total_imported, total_skipped, created_at FROM channel_import_batches ORDER BY created_at DESC LIMIT 1`).first<{total_found: number, total_imported: number, total_skipped: number, created_at: string}>(),
  ]);

  return {
    total: total?.c ?? 0,
    public: publicCh?.c ?? 0,
    private: privateCh?.c ?? 0,
    approved: approvedCh?.c ?? 0,
    pending: pendingCh?.c ?? 0,
    skips: skips?.c ?? 0,
    lastBatch: lastBatch || null,
  };
}
