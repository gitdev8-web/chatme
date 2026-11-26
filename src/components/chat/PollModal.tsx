/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BarChart3, Plus, Trash2, Send } from 'lucide-react';
import { Modal } from '../common/Modal';
import { PollData } from '../../types';

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (poll: PollData) => Promise<void>;
}

export const PollModal: React.FC<PollModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((opt, idx) => (idx === index ? value : opt)));
  };

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = question.trim().length > 0 && validOptions.length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      await onCreatePoll({
        question: question.trim(),
        allowMultiple,
        options: validOptions.map((text, idx) => ({
          id: `opt_${Date.now()}_${idx}`,
          text,
          votes: [],
        })),
      });
      setQuestion('');
      setOptions(['', '']);
      setAllowMultiple(true);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Poll"
      subtitle="Ask a question and collect live votes in this chat"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#8696a0] mb-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-[#00a884]" />
            <span>Question</span>
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            maxLength={200}
            className="w-full rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2.5 text-[16px] sm:text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#8696a0]">
              Options ({options.length}/6)
            </label>
            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1 text-xs font-semibold text-[#00a884] hover:text-[#25d366] py-1 px-2 rounded-lg hover:bg-[#202c33] transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add option</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={100}
                  className="flex-1 rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2.5 text-[16px] sm:text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:outline-none"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    aria-label="Remove option"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-[#8696a0] hover:bg-rose-500/15 hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-[#222d34] bg-[#202c33]/60 px-3.5 py-3 cursor-pointer">
          <div>
            <span className="text-xs font-semibold text-[#e9edef] block">
              Allow multiple answers
            </span>
            <span className="text-[11px] text-[#8696a0]">
              Participants can select more than one option
            </span>
          </div>
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="h-4 w-4 rounded accent-[#00a884] cursor-pointer"
          />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="min-h-[44px] flex items-center gap-1.5 rounded-xl bg-[#00a884] px-5 py-2 text-xs font-bold text-[#0b141a] hover:bg-[#06cf9c] disabled:opacity-45 transition shadow-md"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{submitting ? 'Sending...' : 'Send Poll'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
