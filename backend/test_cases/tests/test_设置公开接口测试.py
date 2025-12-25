# Auto-generated test module for 设置公开接口测试
from atf.core.log_manager import log
from atf.core.globals import Globals
from atf.core.variable_resolver import VariableResolver
from atf.core.request_handler import RequestHandler
from atf.core.assert_handler import AssertHandler
import allure
import yaml

@allure.epic('tests')
class Test设置公开接口测试:
    @classmethod
    def setup_class(cls):
        log.info('========== 开始执行测试用例：test_设置公开接口测试 (测试系统设置获取接口) ==========')
        cls.test_case_data = cls.load_test_case_data()
        cls.steps_dict = {step['id']: step for step in cls.test_case_data['steps']}
        cls.session_vars = {}
        cls.global_vars = Globals.get_data()
        cls.testcase_host = 'http://localhost:8000'
        cls.VR = VariableResolver(global_vars=cls.global_vars, session_vars=cls.session_vars)
        log.info('Setup completed for Test设置公开接口测试')

    @staticmethod
    def load_test_case_data():
        with open(r'/Volumes/DATABASE/code/glam-cart/backend/tests/integration_settings_public.yaml', 'r', encoding='utf-8') as file:
            test_case_data = yaml.safe_load(file)['testcase']
        return test_case_data

    @allure.story('设置公开接口测试')
    def test_设置公开接口测试(self):
        log.info('Starting test_设置公开接口测试')
        # Step: get_settings
        log.info(f'开始执行 step: get_settings')
        get_settings = self.steps_dict.get('get_settings')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=get_settings['method'],
            url=step_host + self.VR.process_data(get_settings['path']),
            headers=self.VR.process_data(get_settings.get('headers')),
            data=self.VR.process_data(get_settings.get('data')),
            params=self.VR.process_data(get_settings.get('params')),
            files=self.VR.process_data(get_settings.get('files'))
        )
        log.info(f'get_settings 请求结果为：{response}')
        self.session_vars['get_settings'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(get_settings['assert']),
            response=response,
            db_config=db_config
        )


        log.info(f"Test case test_设置公开接口测试 completed.")
