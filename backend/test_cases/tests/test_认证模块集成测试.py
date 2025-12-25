# Auto-generated test module for 认证模块集成测试
from atf.core.log_manager import log
from atf.core.globals import Globals
from atf.core.variable_resolver import VariableResolver
from atf.core.request_handler import RequestHandler
from atf.core.assert_handler import AssertHandler
import allure
import yaml

@allure.epic('tests')
class Test认证模块集成测试:
    @classmethod
    def setup_class(cls):
        log.info('========== 开始执行测试用例：test_认证模块集成测试 (测试登录、登出、Token验证等认证相关接口) ==========')
        cls.test_case_data = cls.load_test_case_data()
        cls.steps_dict = {step['id']: step for step in cls.test_case_data['steps']}
        cls.session_vars = {}
        cls.global_vars = Globals.get_data()
        cls.testcase_host = 'http://localhost:8000'
        cls.VR = VariableResolver(global_vars=cls.global_vars, session_vars=cls.session_vars)
        log.info('Setup completed for Test认证模块集成测试')

    @staticmethod
    def load_test_case_data():
        with open(r'/Volumes/DATABASE/code/glam-cart/backend/tests/integration_auth.yaml', 'r', encoding='utf-8') as file:
            test_case_data = yaml.safe_load(file)['testcase']
        return test_case_data

    @allure.story('认证模块集成测试')
    def test_认证模块集成测试(self):
        log.info('Starting test_认证模块集成测试')
        # Step: login_success
        log.info(f'开始执行 step: login_success')
        login_success = self.steps_dict.get('login_success')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=login_success['method'],
            url=step_host + self.VR.process_data(login_success['path']),
            headers=self.VR.process_data(login_success.get('headers')),
            data=self.VR.process_data(login_success.get('data')),
            params=self.VR.process_data(login_success.get('params')),
            files=self.VR.process_data(login_success.get('files'))
        )
        log.info(f'login_success 请求结果为：{response}')
        self.session_vars['login_success'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(login_success['assert']),
            response=response,
            db_config=db_config
        )

        # Step: login_wrong_password
        log.info(f'开始执行 step: login_wrong_password')
        login_wrong_password = self.steps_dict.get('login_wrong_password')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=login_wrong_password['method'],
            url=step_host + self.VR.process_data(login_wrong_password['path']),
            headers=self.VR.process_data(login_wrong_password.get('headers')),
            data=self.VR.process_data(login_wrong_password.get('data')),
            params=self.VR.process_data(login_wrong_password.get('params')),
            files=self.VR.process_data(login_wrong_password.get('files'))
        )
        log.info(f'login_wrong_password 请求结果为：{response}')
        self.session_vars['login_wrong_password'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(login_wrong_password['assert']),
            response=response,
            db_config=db_config
        )

        # Step: verify_token
        log.info(f'开始执行 step: verify_token')
        verify_token = self.steps_dict.get('verify_token')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=verify_token['method'],
            url=step_host + self.VR.process_data(verify_token['path']),
            headers=self.VR.process_data(verify_token.get('headers')),
            data=self.VR.process_data(verify_token.get('data')),
            params=self.VR.process_data(verify_token.get('params')),
            files=self.VR.process_data(verify_token.get('files'))
        )
        log.info(f'verify_token 请求结果为：{response}')
        self.session_vars['verify_token'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(verify_token['assert']),
            response=response,
            db_config=db_config
        )

        # Step: verify_invalid_token
        log.info(f'开始执行 step: verify_invalid_token')
        verify_invalid_token = self.steps_dict.get('verify_invalid_token')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=verify_invalid_token['method'],
            url=step_host + self.VR.process_data(verify_invalid_token['path']),
            headers=self.VR.process_data(verify_invalid_token.get('headers')),
            data=self.VR.process_data(verify_invalid_token.get('data')),
            params=self.VR.process_data(verify_invalid_token.get('params')),
            files=self.VR.process_data(verify_invalid_token.get('files'))
        )
        log.info(f'verify_invalid_token 请求结果为：{response}')
        self.session_vars['verify_invalid_token'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(verify_invalid_token['assert']),
            response=response,
            db_config=db_config
        )

        # Step: logout
        log.info(f'开始执行 step: logout')
        logout = self.steps_dict.get('logout')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=logout['method'],
            url=step_host + self.VR.process_data(logout['path']),
            headers=self.VR.process_data(logout.get('headers')),
            data=self.VR.process_data(logout.get('data')),
            params=self.VR.process_data(logout.get('params')),
            files=self.VR.process_data(logout.get('files'))
        )
        log.info(f'logout 请求结果为：{response}')
        self.session_vars['logout'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(logout['assert']),
            response=response,
            db_config=db_config
        )


        log.info(f"Test case test_认证模块集成测试 completed.")
