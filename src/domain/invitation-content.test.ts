import assert from 'node:assert/strict';
import {
  DEFAULT_INVITATION_CONTENT,
  getInvitationImageUrl,
  isInvitationContent,
} from './invitation-content';

assert.equal(isInvitationContent(DEFAULT_INVITATION_CONTENT), true);

const unsafePhoto = structuredClone(DEFAULT_INVITATION_CONTENT);
unsafePhoto.story[0].photos[0].src = 'javascript:alert(1)';
assert.equal(isInvitationContent(unsafePhoto), false);

const traversalPhoto = structuredClone(DEFAULT_INVITATION_CONTENT);
traversalPhoto.story[0].photos[0].src = 'invitation/../private.jpg';
assert.equal(isInvitationContent(traversalPhoto), false);

const malformedStory = structuredClone(DEFAULT_INVITATION_CONTENT);
malformedStory.story = [];
assert.equal(isInvitationContent(malformedStory), false);

const dynamicStories = structuredClone(DEFAULT_INVITATION_CONTENT);
dynamicStories.story.push({
  id: 'momento-extra',
  visible: false,
  title: 'Un recuerdo más',
  copy: 'Un texto adicional.',
  photos: structuredClone(DEFAULT_INVITATION_CONTENT.story[0].photos),
});
assert.equal(isInvitationContent(dynamicStories), true);

const duplicateStoryIds = structuredClone(dynamicStories);
duplicateStoryIds.story[0].id = 'repetido';
duplicateStoryIds.story[1].id = 'repetido';
assert.equal(isInvitationContent(duplicateStoryIds), false);

const invalidFocus = structuredClone(DEFAULT_INVITATION_CONTENT);
invalidFocus.story[0].photos[0].focusX = 101;
assert.equal(isInvitationContent(invalidFocus), false);

const invalidColor = structuredClone(DEFAULT_INVITATION_CONTENT);
invalidColor.story[0].design = { backgroundColor: 'url(javascript:alert(1))' };
assert.equal(isInvitationContent(invalidColor), false);

const invalidVisibility = structuredClone(DEFAULT_INVITATION_CONTENT);
Object.assign(invalidVisibility.story[0], { visible: 'false' });
assert.equal(isInvitationContent(invalidVisibility), false);

const noVisibleStory = structuredClone(DEFAULT_INVITATION_CONTENT);
noVisibleStory.story.forEach((story) => { story.visible = false; });
assert.equal(isInvitationContent(noVisibleStory), false);

const tooManyStories = structuredClone(DEFAULT_INVITATION_CONTENT);
tooManyStories.story = Array.from({ length: 11 }, (_, index) => ({
  ...structuredClone(DEFAULT_INVITATION_CONTENT.story[0]),
  id: `momento-${index}`,
}));
assert.equal(isInvitationContent(tooManyStories), false);

assert.equal(
  getInvitationImageUrl('invitation/photo.webp', (path) => `public:${path}`),
  'public:invitation/photo.webp'
);
assert.equal(
  getInvitationImageUrl('/images/local-photo.jpg', (path) => `public:${path}`),
  '/images/local-photo.jpg'
);

console.log('Pruebas de contenido de invitación completadas.');
