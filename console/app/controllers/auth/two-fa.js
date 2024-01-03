import Controller from '@ember/controller';
import { action } from '@ember/object';
export default class AuthTwoFaController extends Controller {
    @action verifyCode() {
        // console.log('Verification code submitted!');
    }

    @action resendCode() {
        // console.log('Resending verification code...');
    }
}
