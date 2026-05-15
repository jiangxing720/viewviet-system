import { Helmet } from "react-helmet-async";

const SITE_NAME = "ViewViet";
const DEFAULT_TITLE = "ViewViet — 东南亚华人跨境生活平台";
const DEFAULT_DESCRIPTION =
  "越南语学习、东南亚旅行攻略、法律资讯、律师查询、华人社区活动，一站式服务旅居东南亚的华人。";
const DEFAULT_IMAGE = "/opengraph.jpg";

interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  type?: "website" | "article";
}

export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image = DEFAULT_IMAGE,
  noindex = false,
  type = "website",
}: SeoProps) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonical = path ? `${origin}${path}` : origin;
  const ogImage = image.startsWith("http") ? image : `${origin}${image}`;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="zh_CN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
