"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FEATURE_ICONS } from "@/components/FeatureChip";
import { nextAnswer, PLAYGROUND_FEATURE_KEYS, type FeatureAnswers, type FeatureKey } from "@/lib/playground-types";

type Answer = "yes" | "no" | "unknown";
const answerOf = (value: boolean | undefined): Answer => (value === undefined ? "unknown" : value ? "yes" : "no");

// What a playground has, answered a tap at a time (ops 0022): once = has it, again = doesn't have it
// (its page says "Brez …"), a third time = don't know (left out). Every feature starts at don't
// know, so skipping one never invents a "no". The name stays put while the colour, the ✗ and a line
// through it show a "no"; screen readers hear the answer with the name, and each change is
// announced. `hiddenInputs` puts the answers into the surrounding form (yes / no per answer).
export function FeatureAnswerChips({
  answers,
  onChange,
  hiddenInputs = false,
}: {
  answers: FeatureAnswers;
  onChange: (answers: FeatureAnswers) => void;
  hiddenInputs?: boolean;
}) {
  const t = useTranslations("add.step2");
  const tFeature = useTranslations("filters.feature");
  const hintId = useId();
  const [announcement, setAnnouncement] = useState("");

  function cycle(key: FeatureKey) {
    const next = nextAnswer(answers[key]);
    const updated: FeatureAnswers = { ...answers };
    if (next === undefined) delete updated[key];
    else updated[key] = next;
    onChange(updated);
    setAnnouncement(`${tFeature(key)}: ${t(`featureState.${answerOf(next)}`)}`);
  }

  return (
    <>
      <p id={hintId} className="text-sm text-base-content/70">
        {t("featuresHint")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PLAYGROUND_FEATURE_KEYS.map((key) => {
          const answer = answerOf(answers[key]);
          const Icon = answer === "no" ? X : FEATURE_ICONS[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => cycle(key)}
              aria-describedby={hintId}
              className={`btn gap-1.5 px-3 ${
                answer === "yes" ? "btn-primary" : answer === "no" ? "btn-soft btn-error" : "btn-outline border-base-content/30"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              <span className={answer === "no" ? "line-through" : undefined}>{tFeature(key)}</span>
              <span className="sr-only">, {t(`featureState.${answer}`)}</span>
            </button>
          );
        })}
      </div>
      {hiddenInputs &&
        PLAYGROUND_FEATURE_KEYS.flatMap((key) => {
          const answer = answerOf(answers[key]);
          return answer === "unknown" ? [] : [<input key={key} type="hidden" name={key} value={answer} />];
        })}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
