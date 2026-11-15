import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  DEFAULT_INVITATION_CONTENT,
  isInvitationContent,
} from '../../domain/invitation-content';
import type { InvitationContent, InvitationStory } from '../../domain/invitation-content';
import {
  getInvitationHistory,
  getInvitationImageSignedUrl,
  publishInvitationDraft,
  restoreInvitationRevision,
  saveInvitationDraft,
  uploadInvitationImage,
} from '../../lib/invitation-content';
import type { InvitationRevision } from '../../lib/invitation-content';

interface InvitationEditorViewProps {
  currentAdminId: string | null;
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength: number;
}) {
  const className =
    'w-full rounded-lg border border-[#4A071D]/20 bg-white px-3 py-2 text-sm text-[#211916] focus:border-[#4A071D] focus:outline-none focus:ring-2 focus:ring-[#4A071D]/15';
  return (
    <label className="block space-y-1.5 text-sm font-medium text-[#24130E]">
      <span>{label}</span>
      {multiline ? (
        <textarea
          className={className}
          value={value}
          maxLength={maxLength}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={className}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

function InvitationImage({
  path,
  alt,
  className,
  style,
}: {
  path: string;
  alt: string;
  className: string;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const refreshUrl = async () => {
      try {
        const signedUrl = await getInvitationImageSignedUrl(path);
        if (!active) return;
        setSrc(signedUrl);
        setError(false);
        timer = window.setTimeout(() => void refreshUrl(), 55 * 60 * 1000);
      } catch {
        if (active) setError(true);
      }
    };
    void refreshUrl();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [path]);

  if (error) {
    return <div role="img" aria-label={`${alt}: no se pudo cargar`} className={className}>No se pudo cargar la imagen</div>;
  }
  return <img src={src} alt={alt} className={className} style={style} />;
}

export default function InvitationEditorView({ currentAdminId }: InvitationEditorViewProps) {
  const [content, setContent] = useState<InvitationContent>(DEFAULT_INVITATION_CONTENT);
  const contentRef = useRef(content);
  const [savedContent, setSavedContent] = useState<InvitationContent>(DEFAULT_INVITATION_CONTENT);
  const [past, setPast] = useState<InvitationContent[]>([]);
  const [future, setFuture] = useState<InvitationContent[]>([]);
  const lastEdit = useRef<{ key: string; timestamp: number } | null>(null);
  const [history, setHistory] = useState<InvitationRevision[]>([]);
  const [draftRevision, setDraftRevision] = useState<InvitationRevision | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const previewWidths = { mobile: 390, tablet: 768, desktop: 1280 };
  const hasUnsavedChanges = JSON.stringify(content) !== JSON.stringify(savedContent);
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const visibleStoryCount = content.story.filter((story) => story.visible !== false).length;

  const editContent = (
    update: (current: InvitationContent) => InvitationContent,
    editKey: string
  ) => {
    const current = contentRef.current;
    const next = update(current);
    if (JSON.stringify(current) === JSON.stringify(next)) return;

    const now = Date.now();
    if (!lastEdit.current || lastEdit.current.key !== editKey || now - lastEdit.current.timestamp > 700) {
      setPast((items) => [...items.slice(-49), structuredClone(current)]);
    }
    setFuture([]);
    lastEdit.current = { key: editKey, timestamp: now };
    contentRef.current = next;
    setContent(next);
    setError(null);
    setNotice(null);
  };

  const undo = () => {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast((items) => items.slice(0, -1));
    setFuture((items) => [...items, structuredClone(contentRef.current)]);
    const restored = structuredClone(previous);
    contentRef.current = restored;
    setContent(restored);
    lastEdit.current = null;
  };

  const redo = () => {
    const next = future[future.length - 1];
    if (!next) return;
    setFuture((items) => items.slice(0, -1));
    setPast((items) => [...items, structuredClone(contentRef.current)]);
    const restored = structuredClone(next);
    contentRef.current = restored;
    setContent(restored);
    lastEdit.current = null;
  };

  const loadHistory = async (keepEditorContent = false) => {
    setLoading(true);
    setError(null);
    try {
      const revisions = await getInvitationHistory();
      const draft = revisions.find((revision) => revision.status === 'draft') ?? null;
      const published = revisions.find((revision) => revision.status === 'published') ?? null;
      setHistory(revisions);
      setDraftRevision(draft);
      if (!keepEditorContent) {
        const loadedContent = structuredClone(
          draft?.content ?? published?.content ?? DEFAULT_INVITATION_CONTENT
        );
        contentRef.current = loadedContent;
        setContent(loadedContent);
        setSavedContent(structuredClone(loadedContent));
        setPast([]);
        setFuture([]);
        lastEdit.current = null;
      }
    } catch (loadError: unknown) {
      console.error('Error al cargar el editor de invitación:', loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    const handleUndoRedo = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [past, future]);

  const updateStory = (index: number, patch: Partial<InvitationStory>) => {
    const editKey = `story-${index}-${Object.keys(patch)[0]}`;
    editContent((current) => ({
      ...current,
      story: current.story.map((story, storyIndex) =>
        storyIndex === index ? { ...story, ...patch } : story
      ),
    }), editKey);
  };

  const updatePhoto = (
    storyIndex: number,
    photoIndex: number,
    patch: Partial<InvitationStory['photos'][number]>
  ) => {
    const editKey = `photo-${storyIndex}-${photoIndex}-${Object.keys(patch)[0]}`;
    editContent((current) => ({
      ...current,
      story: current.story.map((story, currentStoryIndex) =>
        currentStoryIndex === storyIndex
          ? {
              ...story,
              photos: story.photos.map((photo, currentPhotoIndex) =>
                currentPhotoIndex === photoIndex ? { ...photo, ...patch } : photo
              ),
            }
          : story
      ),
    }), editKey);
  };

  const moveStory = (index: number, offset: -1 | 1) => {
    const destination = index + offset;
    if (destination < 0 || destination >= contentRef.current.story.length) return;
    editContent((current) => {
      const story = [...current.story];
      [story[index], story[destination]] = [story[destination], story[index]];
      return { ...current, story };
    }, `move-story-${index}-${destination}`);
  };

  const duplicateStory = (index: number) => {
    editContent((current) => {
      if (current.story.length >= 10) return current;
      const copy = structuredClone(current.story[index]);
      copy.id = crypto.randomUUID();
      copy.title = `${copy.title} (copia)`.slice(0, 120);
      copy.visible = true;
      return {
        ...current,
        story: [...current.story.slice(0, index + 1), copy, ...current.story.slice(index + 1)],
      };
    }, `duplicate-story-${index}`);
  };

  const addStory = () => {
    editContent((current) => {
      if (current.story.length >= 10) return current;
      const photos = structuredClone(DEFAULT_INVITATION_CONTENT.story[0].photos);
      return {
        ...current,
        story: [
          ...current.story,
          {
            id: crypto.randomUUID(),
            visible: true,
            title: 'Nuevo momento',
            copy: 'Escribí aquí el texto de este momento.',
            photos,
          },
        ],
      };
    }, 'add-story');
  };

  const removeStory = (index: number) => {
    if (contentRef.current.story.length <= 1) return;
    editContent(
      (current) => ({ ...current, story: current.story.filter((_, storyIndex) => storyIndex !== index) }),
      `remove-story-${index}`
    );
  };

  const handleImageUpload = async (
    storyIndex: number,
    photoIndex: number,
    file: File
  ) => {
    const key = `${storyIndex}-${photoIndex}`;
    setUploadingImage(key);
    setError(null);
    setNotice(null);
    try {
      const path = await uploadInvitationImage(file);
      updatePhoto(storyIndex, photoIndex, { src: path });
      setNotice('Imagen subida. Guardá el borrador para conservar el cambio en la invitación.');
    } catch (uploadError: unknown) {
      console.error('Error al subir una imagen de la invitación:', uploadError);
      setError(getErrorMessage(uploadError));
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!currentAdminId) {
      setError('La sesión de administrador todavía no está disponible.');
      return;
    }
    if (!isInvitationContent(content)) {
      setError('Revisá los campos: hay textos vacíos, demasiado largos o una ruta de imagen inválida.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await saveInvitationDraft(content, draftRevision?.updated_at ?? null);
      setDraftRevision(saved);
      setSavedContent(structuredClone(content));
      setPast([]);
      setFuture([]);
      lastEdit.current = null;
      setNotice('Borrador guardado. Todavía no es visible para los invitados.');
      await loadHistory(true);
    } catch (saveError: unknown) {
      console.error('Error al guardar el borrador de la invitación:', saveError);
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!currentAdminId) {
      setError('La sesión de administrador todavía no está disponible.');
      return;
    }
    if (!draftRevision) {
      setError('Guardá un borrador antes de publicarlo.');
      return;
    }
    if (hasUnsavedChanges) {
      setError('Guardá los cambios actuales antes de publicar.');
      return;
    }

    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const version = await publishInvitationDraft(draftRevision.updated_at);
      setNotice(`La versión ${version} ya está publicada.`);
      await loadHistory();
    } catch (publishError: unknown) {
      console.error('Error al publicar la invitación:', publishError);
      setError(getErrorMessage(publishError));
    } finally {
      setPublishing(false);
    }
  };

  const restoreRevision = async (revision: InvitationRevision) => {
    if (!isInvitationContent(revision.content)) {
      setError('No se puede restaurar esta versión porque su contenido es inválido.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const restored = await restoreInvitationRevision(revision.id, draftRevision?.updated_at ?? null);
      setDraftRevision(restored);
      const restoredContent = structuredClone(restored.content);
      contentRef.current = restoredContent;
      setContent(restoredContent);
      setSavedContent(structuredClone(restoredContent));
      setPast([]);
      setFuture([]);
      lastEdit.current = null;
      setNotice(`Se restauró la versión ${revision.version ?? 'archivada'} como borrador.`);
      await loadHistory(true);
    } catch (restoreError: unknown) {
      setError(getErrorMessage(restoreError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-[#4A071D]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#4A071D]/20 border-t-[#4A071D]" />
        <span>Cargando contenido e historial…</span>
      </div>
    );
  }

  if (!currentAdminId) {
    return (
      <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        La sesión administrativa aún no está lista. Actualizá el panel antes de editar la invitación.
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="invitation-editor-heading">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="invitation-editor-heading" className="font-serif text-2xl font-bold text-[#24130E]">
            Editor visual de la invitación
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-[#211916]/70">
            Editá los textos y las fotografías de la tarjeta. El horario, la confirmación, los precios y los registros siguen en sus pantallas actuales.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadHistory()}
          className="inline-flex items-center gap-2 rounded-lg border border-[#4A071D]/20 bg-white px-3 py-2 text-sm font-medium text-[#4A071D] hover:bg-[#F3F0EB]"
        >
          <RefreshCw size={16} /> Recargar
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#4A071D]/15 bg-white px-4 py-3">
        <p role="status" className="text-sm font-medium">
          {saving ? 'Guardando borrador…' : hasUnsavedChanges ? 'Hay cambios sin guardar' : 'Todos los cambios están guardados'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo || saving || publishing}
            aria-label="Deshacer (Ctrl+Z)"
            title="Deshacer (Ctrl+Z)"
            className="rounded-lg border border-[#4A071D]/20 p-2 text-[#4A071D] disabled:opacity-40"
          >
            <Undo2 size={17} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo || saving || publishing}
            aria-label="Rehacer (Ctrl+Mayús+Z)"
            title="Rehacer (Ctrl+Mayús+Z)"
            className="rounded-lg border border-[#4A071D]/20 p-2 text-[#4A071D] disabled:opacity-40"
          >
            <Redo2 size={17} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="space-y-5">
          <section className="space-y-4 rounded-2xl border border-[#4A071D]/15 bg-white p-5 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-[#24130E]">Portada y mensaje</h3>
            <TextField
              label="Nombres"
              value={content.names}
              maxLength={120}
              onChange={(value) => editContent((current) => ({ ...current, names: value }), 'names')}
            />
            <TextField
              label="Texto de la música"
              value={content.music_title}
              maxLength={160}
              onChange={(value) => editContent((current) => ({ ...current, music_title: value }), 'music-title')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Versículo — primera línea"
                value={content.verse.first_line}
                maxLength={240}
                onChange={(value) => editContent((current) => ({ ...current, verse: { ...current.verse, first_line: value } }), 'verse-first')}
              />
              <TextField
                label="Versículo — segunda línea"
                value={content.verse.second_line}
                maxLength={360}
                onChange={(value) => editContent((current) => ({ ...current, verse: { ...current.verse, second_line: value } }), 'verse-second')}
              />
              <TextField
                label="Versículo — tercera línea"
                value={content.verse.third_line}
                maxLength={240}
                onChange={(value) => editContent((current) => ({ ...current, verse: { ...current.verse, third_line: value } }), 'verse-third')}
              />
              <TextField
                label="Referencia"
                value={content.verse.reference}
                maxLength={80}
                onChange={(value) => editContent((current) => ({ ...current, verse: { ...current.verse, reference: value } }), 'verse-reference')}
              />
            </div>
          </section>

          {content.story.map((story, storyIndex) => (
            <section key={story.id ?? storyIndex} className={`space-y-4 rounded-2xl border border-[#4A071D]/15 bg-white p-5 shadow-sm ${story.visible === false ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-serif text-lg font-bold text-[#24130E]">
                  Historia · momento {storyIndex + 1}
                </h3>
                <div className="flex flex-wrap gap-1">
                  <button type="button" onClick={() => moveStory(storyIndex, -1)} disabled={storyIndex === 0} aria-label={`Mover momento ${storyIndex + 1} hacia arriba`} className="rounded-md border p-2 disabled:opacity-35"><ArrowUp size={15} /></button>
                  <button type="button" onClick={() => moveStory(storyIndex, 1)} disabled={storyIndex === content.story.length - 1} aria-label={`Mover momento ${storyIndex + 1} hacia abajo`} className="rounded-md border p-2 disabled:opacity-35"><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => duplicateStory(storyIndex)} disabled={content.story.length >= 10} aria-label={`Duplicar momento ${storyIndex + 1}`} className="rounded-md border p-2 disabled:opacity-35"><Copy size={15} /></button>
                  <button
                    type="button"
                    onClick={() => updateStory(storyIndex, { visible: story.visible === false })}
                    disabled={story.visible !== false && visibleStoryCount <= 1}
                    aria-label={story.visible === false ? `Mostrar momento ${storyIndex + 1}` : `Ocultar momento ${storyIndex + 1}`}
                    className="rounded-md border p-2 disabled:opacity-35"
                  >
                    {story.visible === false ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button type="button" onClick={() => removeStory(storyIndex)} disabled={content.story.length <= 1} aria-label={`Eliminar momento ${storyIndex + 1}`} className="rounded-md border p-2 text-rose-700 disabled:opacity-35"><Trash2 size={15} /></button>
                </div>
              </div>
              {story.handwritten !== undefined && (
                <TextField
                  label="Frase manuscrita"
                  value={story.handwritten ?? ''}
                  maxLength={80}
                  onChange={(value) => updateStory(storyIndex, { handwritten: value })}
                />
              )}
              <TextField
                label="Título"
                value={story.title}
                maxLength={120}
                onChange={(value) => updateStory(storyIndex, { title: value })}
              />
              <TextField
                label="Texto"
                value={story.copy}
                maxLength={1600}
                multiline
                onChange={(value) => updateStory(storyIndex, { copy: value })}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  ['backgroundColor', 'Fondo', '#4A101B'],
                  ['titleColor', 'Título', '#FFF7ED'],
                  ['textColor', 'Texto', '#EADFD3'],
                ] as const).map(([property, label, defaultColor]) => (
                  <label key={property} className="flex items-center justify-between gap-3 rounded-lg border border-[#4A071D]/10 px-3 py-2 text-sm">
                    <span>{label}</span>
                    <input
                      type="color"
                      aria-label={`Color de ${label.toLowerCase()} del momento ${storyIndex + 1}`}
                      value={story.design?.[property] ?? defaultColor}
                      onChange={(event) => updateStory(storyIndex, {
                        design: { ...story.design, [property]: event.target.value },
                      })}
                      className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>
                ))}
              </div>
              {story.invitation !== undefined && story.couple !== undefined && (
                <>
                  <TextField
                    label="Invitación manuscrita"
                    value={story.invitation ?? ''}
                    maxLength={360}
                    multiline
                    onChange={(value) => updateStory(storyIndex, { invitation: value })}
                  />
                  <TextField
                    label="Firma"
                    value={story.couple ?? ''}
                    maxLength={80}
                    onChange={(value) => updateStory(storyIndex, { couple: value })}
                  />
                </>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {story.photos.map((photo, photoIndex) => {
                  const uploadKey = `${storyIndex}-${photoIndex}`;
                  return (
                    <div key={uploadKey} className="space-y-2 rounded-xl border border-[#4A071D]/10 bg-[#F8F5EF] p-3">
                      <InvitationImage
                        path={photo.src}
                        alt={photo.alt}
                        className="h-40 w-full rounded-lg border border-white object-cover shadow-sm"
                        style={{ objectPosition: `${photo.focusX ?? 50}% ${photo.focusY ?? 50}%` }}
                      />
                      <TextField
                        label={`Texto alternativo · foto ${photoIndex + 1}`}
                        value={photo.alt}
                        maxLength={180}
                        onChange={(value) => updatePhoto(storyIndex, photoIndex, { alt: value })}
                      />
                      <label className="block text-xs font-medium text-[#24130E]">
                        Encuadre horizontal · {photo.focusX ?? 50}%
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={photo.focusX ?? 50}
                          onChange={(event) => updatePhoto(storyIndex, photoIndex, { focusX: Number(event.target.value) })}
                          className="mt-1 w-full accent-[#4A071D]"
                        />
                      </label>
                      <label className="block text-xs font-medium text-[#24130E]">
                        Encuadre vertical · {photo.focusY ?? 50}%
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={photo.focusY ?? 50}
                          onChange={(event) => updatePhoto(storyIndex, photoIndex, { focusY: Number(event.target.value) })}
                          className="mt-1 w-full accent-[#4A071D]"
                        />
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#4A071D]/20 bg-white px-3 py-2 text-sm font-medium text-[#4A071D] hover:bg-[#F3F0EB]">
                        <ImagePlus size={16} />
                        {uploadingImage === uploadKey ? 'Subiendo…' : `Cambiar foto ${photoIndex + 1}`}
                        <input
                          className="sr-only"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingImage !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = '';
                            if (file) void handleImageUpload(storyIndex, photoIndex, file);
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <button
            type="button"
            onClick={addStory}
            disabled={content.story.length >= 10}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#4A071D]/40 px-4 py-3 text-sm font-semibold text-[#4A071D] disabled:opacity-40"
          >
            <Plus size={17} /> Agregar momento
          </button>

          <section className="grid gap-4 rounded-2xl border border-[#4A071D]/15 bg-white p-5 shadow-sm sm:grid-cols-2">
            <TextField
              label="Título de confirmación"
              value={content.rsvp_title}
              maxLength={120}
              onChange={(value) => editContent((current) => ({ ...current, rsvp_title: value }), 'rsvp-title')}
            />
            <TextField
              label="Título de regalos"
              value={content.gifts_title}
              maxLength={100}
              onChange={(value) => editContent((current) => ({ ...current, gifts_title: value }), 'gifts-title')}
            />
            {content.gifts_options.map((option, index) => (
              <TextField
                key={index}
                label={`Opción de regalo ${index + 1}`}
                value={option}
                maxLength={120}
                onChange={(value) =>
                  editContent((current) => ({
                    ...current,
                    gifts_options: index === 0
                      ? [value, current.gifts_options[1]]
                      : [current.gifts_options[0], value],
                  }), `gift-option-${index}`)
                }
              />
            ))}
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={saving || publishing || uploadingImage !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-[#4A071D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#672B32] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} /> {saving ? 'Guardando…' : 'Guardar borrador'}
            </button>
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={publishing || saving || uploadingImage !== null || !draftRevision || hasUnsavedChanges}
              className="inline-flex items-center gap-2 rounded-lg border border-[#4A071D] px-4 py-2.5 text-sm font-semibold text-[#4A071D] hover:bg-[#4A071D]/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={17} /> {publishing ? 'Publicando…' : 'Publicar borrador'}
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#4A071D]/15 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-serif text-lg font-bold text-[#24130E]">Vista previa del contenido</h3>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Ancho de vista previa">
              {([
                ['mobile', 'Móvil'],
                ['tablet', 'Tablet'],
                ['desktop', 'Escritorio'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={previewMode === mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    previewMode === mode
                      ? 'border-[#4A071D] bg-[#4A071D] text-white'
                      : 'border-[#4A071D]/20 text-[#4A071D]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mb-3 text-xs text-[#211916]/60">
              Ancho de referencia: {previewWidths[previewMode]} px. Esta vista muestra los cambios de contenido; aún no representa toda la composición pública.
            </p>
            <div className="overflow-auto rounded-xl border border-[#4A071D]/10 bg-[#E9E5DE] p-3">
              <div
                className="overflow-hidden rounded-[2rem] border-[8px] border-[#24130E] bg-[#F8F5EF] shadow-xl"
                style={{ width: `${previewWidths[previewMode]}px`, maxWidth: 'none' }}
              >
              <div className="bg-[#4A101B] px-5 py-8 text-center text-white">
                <p className="font-serif text-2xl">{content.names}</p>
                <p className="mt-3 text-xs text-white/80">{content.music_title}</p>
              </div>
              <div className="space-y-5 p-4">
                {content.story.filter((story) => story.visible !== false).map((story, storyIndex) => (
                  <article key={story.id ?? storyIndex} className="rounded-xl bg-white p-3 shadow-sm" style={{ backgroundColor: story.design?.backgroundColor }}>
                    <h4 className="font-serif text-lg" style={{ color: story.design?.titleColor ?? '#4A071D' }}>{story.title}</h4>
                    <p className="mt-1 line-clamp-4 text-xs leading-relaxed" style={{ color: story.design?.textColor ?? '#392b25' }}>{story.copy}</p>
                    <div
                      className="mt-3 grid gap-2"
                      style={{ gridTemplateColumns: previewMode === 'mobile' ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}
                    >
                      {story.photos.map((photo, photoIndex) => (
                        <InvitationImage
                          key={photoIndex}
                          path={photo.src}
                          alt=""
                          className="h-20 w-full rounded-sm border-4 border-white object-cover shadow"
                          style={{ objectPosition: `${photo.focusX ?? 50}% ${photo.focusY ?? 50}%` }}
                        />
                      ))}
                    </div>
                  </article>
                ))}
                <div className="rounded-xl bg-[#4A101B] p-4 text-center text-white">
                  <p className="font-serif text-xl">{content.rsvp_title}</p>
                  <p className="mt-2 text-xs">{content.gifts_title}</p>
                </div>
              </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#4A071D]/15 bg-white p-5 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-[#24130E]">Versiones</h3>
            <p className="mt-1 text-xs text-[#211916]/60">
              {draftRevision
                ? `Borrador pendiente · actualizado ${new Date(draftRevision.updated_at).toLocaleString('es-AR')}`
                : 'No hay borradores pendientes.'}
            </p>
            <ol className="mt-4 space-y-3">
              {history.map((revision) => (
                <li key={revision.id} className="rounded-lg border border-[#4A071D]/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#24130E]">
                        {revision.status === 'draft'
                          ? 'Borrador'
                          : `Versión ${revision.version}`}
                        {revision.status === 'published' && ' · publicada'}
                      </p>
                      <p className="mt-1 text-xs text-[#211916]/60">
                        {new Date(revision.published_at ?? revision.updated_at).toLocaleString('es-AR')}
                      </p>
                    </div>
                    {revision.status !== 'draft' && (
                      <button
                        type="button"
                        onClick={() => restoreRevision(revision)}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#4A071D] underline underline-offset-2"
                      >
                        <Undo2 size={14} /> Usar como base
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {history.length === 0 && (
                <li className="text-sm text-[#211916]/60">Todavía no hay versiones registradas.</li>
              )}
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}
