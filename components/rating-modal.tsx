"use client";

import { useState } from "react";
import { CONTRACTOR_TAGS, FREELANCER_TAGS, REVIEW_COMMENT, type ViewMode } from "@/lib/core/types";
import { useFreelas } from "@/lib/store/freelas-store";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Chip } from "./ui/chip";
import { Field, Textarea } from "./ui/field";
import { Modal } from "./ui/modal";
import { StarInput } from "./ui/stars";

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  /** Who is rating. The contractor rates the freelancer and vice versa. */
  by: ViewMode;
  targetName: string;
  subtitle: string;
}

/** Two-way rating: 1–5 stars, quick feedback tags and a required short comment. */
export function RatingModal({
  open,
  onOpenChange,
  applicationId,
  by,
  targetName,
  subtitle,
}: RatingModalProps) {
  const { dispatch, notify } = useFreelas();
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<{ stars?: string; comment?: string }>({});
  const options = by === "contratante" ? FREELANCER_TAGS : CONTRACTOR_TAGS;

  function toggle(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  function submit() {
    const text = comment.trim();
    const err: typeof errors = {};
    if (stars === 0) err.stars = "Escolha de 1 a 5 estrelas.";
    if (text.length < REVIEW_COMMENT.min)
      err.comment = `Escreva pelo menos ${REVIEW_COMMENT.min} caracteres sobre o turno.`;
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    dispatch({
      type: "review",
      applicationId,
      by,
      review: { stars, tags, comment: text, createdAt: new Date().toISOString() },
    });
    notify(`Avaliação de ${targetName} enviada`);
    onOpenChange(false);
    setStars(0);
    setTags([]);
    setComment("");
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Como foi o turno?"
      description="A avaliação fica visível no perfil e ajuda nas próximas escolhas."
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
          <Avatar name={targetName} square={by === "freelancer"} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{targetName}</p>
            <p className="truncate text-sm text-muted">{subtitle}</p>
          </div>
        </div>

        <div>
          <StarInput value={stars} onChange={setStars} />
          {errors.stars && (
            <p role="alert" className="mt-1 text-center text-sm text-danger">
              {errors.stars}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">O que se destacou?</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((tag) => (
              <Chip key={tag} selected={tags.includes(tag)} onClick={() => toggle(tag)}>
                {tag}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Field
          label="Comentário"
          error={errors.comment}
          hint={`${comment.trim().length}/${REVIEW_COMMENT.max} caracteres, mínimo ${REVIEW_COMMENT.min}.`}
        >
          {(a) => (
            <Textarea
              {...a}
              rows={3}
              maxLength={REVIEW_COMMENT.max}
              placeholder={
                by === "contratante"
                  ? "Ex.: Chegou no horário e atendeu bem as mesas."
                  : "Ex.: Pagamento em dia e equipe bem organizada."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          )}
        </Field>

        <Button variant="cta" size="lg" block onClick={submit}>
          Enviar avaliação
        </Button>
      </div>
    </Modal>
  );
}
