import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
export default class AuthTwoFaController extends Controller {
    @tracked token;
    @tracked timerValue = 60;
    queryParams = ['token'];
    @action verifyCode() {
        // console.log('Verification code submitted!');
    }

    @action resendCode() {
        // console.log('Resending verification code...');
    }

    @action resetTimer() {
    }
}
