# Auto-generated test module for 产品管理接口集成测试
from atf.core.log_manager import log
from atf.core.globals import Globals
from atf.core.variable_resolver import VariableResolver
from atf.core.request_handler import RequestHandler
from atf.core.assert_handler import AssertHandler
import allure
import yaml

@allure.epic('tests')
class Test产品管理接口集成测试:
    @classmethod
    def setup_class(cls):
        log.info('========== 开始执行测试用例：test_产品管理接口集成测试 (测试管理员产品管理接口（需要认证）) ==========')
        cls.test_case_data = cls.load_test_case_data()
        cls.steps_dict = {step['id']: step for step in cls.test_case_data['steps']}
        cls.session_vars = {}
        cls.global_vars = Globals.get_data()
        cls.testcase_host = 'http://localhost:8000'
        cls.VR = VariableResolver(global_vars=cls.global_vars, session_vars=cls.session_vars)
        log.info('Setup completed for Test产品管理接口集成测试')

    @staticmethod
    def load_test_case_data():
        with open(r'/Volumes/DATABASE/code/glam-cart/backend/tests/integration_admin_products.yaml', 'r', encoding='utf-8') as file:
            test_case_data = yaml.safe_load(file)['testcase']
        return test_case_data

    @allure.story('产品管理接口集成测试')
    def test_产品管理接口集成测试(self):
        log.info('Starting test_产品管理接口集成测试')
        # Step: admin_login
        log.info(f'开始执行 step: admin_login')
        admin_login = self.steps_dict.get('admin_login')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=admin_login['method'],
            url=step_host + self.VR.process_data(admin_login['path']),
            headers=self.VR.process_data(admin_login.get('headers')),
            data=self.VR.process_data(admin_login.get('data')),
            params=self.VR.process_data(admin_login.get('params')),
            files=self.VR.process_data(admin_login.get('files'))
        )
        log.info(f'admin_login 请求结果为：{response}')
        self.session_vars['admin_login'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(admin_login['assert']),
            response=response,
            db_config=db_config
        )

        # Step: create_product_no_auth
        log.info(f'开始执行 step: create_product_no_auth')
        create_product_no_auth = self.steps_dict.get('create_product_no_auth')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=create_product_no_auth['method'],
            url=step_host + self.VR.process_data(create_product_no_auth['path']),
            headers=self.VR.process_data(create_product_no_auth.get('headers')),
            data=self.VR.process_data(create_product_no_auth.get('data')),
            params=self.VR.process_data(create_product_no_auth.get('params')),
            files=self.VR.process_data(create_product_no_auth.get('files'))
        )
        log.info(f'create_product_no_auth 请求结果为：{response}')
        self.session_vars['create_product_no_auth'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(create_product_no_auth['assert']),
            response=response,
            db_config=db_config
        )


        log.info(f"Test case test_产品管理接口集成测试 completed.")
