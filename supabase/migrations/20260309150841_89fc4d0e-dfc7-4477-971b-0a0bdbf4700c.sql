
-- Aggregate function for admin dashboard KPIs + 6-month trend + recent activity
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_badges int;
  active_assertions int;
  revoked_assertions int;
  total_learners int;
  trend_data jsonb;
  recent_data jsonb;
BEGIN
  -- KPI counts
  SELECT count(*) INTO total_badges FROM badge_classes;
  SELECT count(*) FILTER (WHERE NOT revoked) INTO active_assertions FROM assertions;
  SELECT count(*) FILTER (WHERE revoked) INTO revoked_assertions FROM assertions;
  SELECT count(*) INTO total_learners FROM profiles;

  -- 6-month trend
  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.month), '[]'::jsonb)
  INTO trend_data
  FROM (
    SELECT to_char(d, 'Mon YYYY') AS month,
           coalesce(c.cnt, 0) AS count
    FROM generate_series(
      date_trunc('month', now()) - interval '5 months',
      date_trunc('month', now()),
      interval '1 month'
    ) AS d
    LEFT JOIN (
      SELECT date_trunc('month', issued_at) AS m, count(*) AS cnt
      FROM assertions
      WHERE issued_at >= date_trunc('month', now()) - interval '5 months'
      GROUP BY 1
    ) c ON c.m = d
  ) t;

  -- Recent 10 assertions with learner + badge names
  SELECT coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO recent_data
  FROM (
    SELECT a.id, a.issued_at, a.revoked,
           coalesce(p.full_name, 'Unknown') AS learner_name,
           coalesce(bc.name, 'Unknown') AS badge_name
    FROM assertions a
    LEFT JOIN profiles p ON p.user_id = a.recipient_id
    LEFT JOIN badge_classes bc ON bc.id = a.badge_class_id
    ORDER BY a.issued_at DESC
    LIMIT 10
  ) r;

  result := jsonb_build_object(
    'total_badges', total_badges,
    'active_assertions', active_assertions,
    'revoked_assertions', revoked_assertions,
    'total_learners', total_learners,
    'chart_data', trend_data,
    'recent', recent_data
  );

  RETURN result;
END;
$$;
