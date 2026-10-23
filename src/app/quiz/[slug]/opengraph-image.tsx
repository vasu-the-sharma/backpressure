import { getQuiz } from "@/content/quizzes/registry";
import { OG_SIZE, PageCard, ogFonts } from "@/lib/og";
import { ImageResponse } from "next/og";

export const alt = "A Backpressure quiz: its title, topic and number of questions";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quiz = getQuiz(slug);
  return new ImageResponse(
    <PageCard
      section="Quiz"
      title={quiz?.title ?? "Quiz"}
      sub={quiz?.blurb ?? ""}
      chips={quiz ? [quiz.topic, `${quiz.questions.length} questions`] : []}
      path={`/quiz/${slug}`}
    />,
    { ...size, fonts: await ogFonts() },
  );
}
