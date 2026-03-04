import { useState } from 'react';

interface ContentSection {
  id: string;
  title: string;
  text: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition: 'top' | 'left' | 'right' | 'none';
}

interface NewsletterBuilderProps {
  memberCount: number;
}

export default function NewsletterBuilder({ memberCount }: NewsletterBuilderProps) {
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageAlt, setHeroImageAlt] = useState('');
  const [sections, setSections] = useState<ContentSection[]>([
    { id: '1', title: '', text: '', imageUrl: '', imageAlt: '', imagePosition: 'none' }
  ]);
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const addSection = () => {
    setSections([
      ...sections,
      { id: Date.now().toString(), title: '', text: '', imageUrl: '', imageAlt: '', imagePosition: 'none' }
    ]);
  };

  const removeSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(s => s.id !== id));
    }
  };

  const updateSection = (id: string, field: keyof ContentSection, value: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const getPayload = () => ({
    subject,
    headline,
    introduction,
    heroImageUrl: heroImageUrl || undefined,
    heroImageAlt: heroImageAlt || undefined,
    sections: sections.map(s => ({
      title: s.title || undefined,
      text: s.text,
      imageUrl: s.imagePosition !== 'none' && s.imageUrl ? s.imageUrl : undefined,
      imageAlt: s.imagePosition !== 'none' && s.imageUrl ? s.imageAlt : undefined,
      imagePosition: s.imagePosition !== 'none' ? s.imagePosition : undefined,
    })),
    ctaText: ctaText || undefined,
    ctaUrl: ctaUrl || undefined,
  });

  const validateForm = () => {
    if (!subject.trim()) return 'Subject is required';
    if (!headline.trim()) return 'Headline is required';
    if (!introduction.trim()) return 'Introduction is required';
    if (!sections.some(s => s.text.trim())) return 'At least one section with text is required';
    return null;
  };

  const sendTestEmail = async () => {
    const error = validateForm();
    if (error) {
      setStatus({ message: error, isError: true });
      return;
    }
    if (!testEmail.trim()) {
      setStatus({ message: 'Please enter a test email address', isError: true });
      return;
    }

    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getPayload(), testEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus({ message: data.message || 'Test email sent!', isError: false });
      } else {
        setStatus({ message: data.error || 'Failed to send', isError: true });
      }
    } catch {
      setStatus({ message: 'Failed to send test email', isError: true });
    } finally {
      setIsSending(false);
    }
  };

  const sendToAll = async () => {
    const error = validateForm();
    if (error) {
      setStatus({ message: error, isError: true });
      return;
    }

    if (!confirm(`Are you sure you want to send this newsletter to ALL ${memberCount} active members? This cannot be undone.`)) {
      return;
    }

    setIsSending(true);
    setStatus({ message: 'Sending newsletters in batches, please wait...', isError: false });

    try {
      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getPayload()),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus({ message: data.message || 'Newsletter sent!', isError: false });
      } else {
        setStatus({ message: data.error || 'Failed to send', isError: true });
      }
    } catch {
      setStatus({ message: 'Failed to send newsletter', isError: true });
    } finally {
      setIsSending(false);
    }
  };

  const clearForm = () => {
    if (confirm('Clear all fields?')) {
      setSubject('');
      setHeadline('');
      setIntroduction('');
      setHeroImageUrl('');
      setHeroImageAlt('');
      setSections([{ id: '1', title: '', text: '', imageUrl: '', imageAlt: '', imagePosition: 'none' }]);
      setCtaText('');
      setCtaUrl('');
      setTestEmail('');
      setStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subject Line */}
      <div className="backdrop-blur-xl bg-white/80 rounded-2xl p-6 border border-white/50 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Subject</h3>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Your newsletter subject line..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        />
        <p className="text-xs text-gray-500 mt-1">This appears in the recipient's inbox</p>
      </div>

      {/* Hero Section */}
      <div className="backdrop-blur-xl bg-white/80 rounded-2xl p-6 border border-white/50 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Header</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline *</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Main headline of your newsletter..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Introduction *</label>
            <textarea
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              rows={3}
              placeholder="Opening paragraph that follows 'Hi [Name],'..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image (optional)</label>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="url"
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
              />
              <input
                type="text"
                value={heroImageAlt}
                onChange={(e) => setHeroImageAlt(e.target.value)}
                placeholder="Image description (alt text)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Full-width image displayed below the header</p>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="backdrop-blur-xl bg-white/80 rounded-2xl p-6 border border-white/50 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Content Sections</h3>
          <button
            type="button"
            onClick={addSection}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Section
          </button>
        </div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={section.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-600">Section {index + 1}</span>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(section.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                  placeholder="Section title (optional)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />

                <textarea
                  value={section.text}
                  onChange={(e) => updateSection(section.id, 'text', e.target.value)}
                  rows={4}
                  placeholder="Section content..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                />

                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Image (optional)</label>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input
                      type="url"
                      value={section.imageUrl}
                      onChange={(e) => updateSection(section.id, 'imageUrl', e.target.value)}
                      placeholder="Image URL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                    />
                    <input
                      type="text"
                      value={section.imageAlt}
                      onChange={(e) => updateSection(section.id, 'imageAlt', e.target.value)}
                      placeholder="Alt text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                    />
                    <select
                      value={section.imagePosition}
                      onChange={(e) => updateSection(section.id, 'imagePosition', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                    >
                      <option value="none">No image</option>
                      <option value="top">Full width (above text)</option>
                      <option value="left">Left side</option>
                      <option value="right">Right side</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="backdrop-blur-xl bg-white/80 rounded-2xl p-6 border border-white/50 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Call to Action (optional)</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g., Learn More, Register Now"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Button URL</label>
            <input
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* Send Section */}
      <div className="backdrop-blur-xl bg-white/80 rounded-2xl p-6 border border-white/50 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Newsletter</h3>

        {/* Test Email */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Test Email First (Recommended)</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
            <button
              type="button"
              onClick={sendTestEmail}
              disabled={isSending}
              className="px-4 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {isSending ? 'Sending...' : 'Send Test'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Preview the email before sending to all members</p>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm text-amber-800 font-medium">This will send to {memberCount} active members</p>
              <p className="text-xs text-amber-700 mt-1">Emails will be sent in batches. This action cannot be undone.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={sendToAll}
            disabled={isSending}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send to All Members'}
          </button>
          <button
            type="button"
            onClick={clearForm}
            disabled={isSending}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {/* Status Message */}
        {status && (
          <p className={`text-sm text-center mt-4 ${status.isError ? 'text-red-600' : 'text-green-600'}`}>
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
