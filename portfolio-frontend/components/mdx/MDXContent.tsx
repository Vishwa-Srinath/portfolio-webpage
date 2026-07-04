import { MDXRemote } from "next-mdx-remote/rsc";

interface Props {
  source: string;
}

export function MDXContent({ source }: Props) {
  return (
    <article className="prose max-w-none">
      <MDXRemote source={source} />
    </article>
  );
}
