import Chat from './modules/chat'
import RegistrationForm from './modules/registrationForm'
import Search from './modules/search'

if (document.querySelector('#chat-wrapper')) { new Chat() }
if (document.querySelector('.header-search-icon')) { new Search() }
if (document.querySelector('#registration-form')) { new RegistrationForm() }