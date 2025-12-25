# Auto-generated test module for 产品公开接口集成测试
from atf.core.log_manager import log
from atf.core.globals import Globals
from atf.core.variable_resolver import VariableResolver
from atf.core.request_handler import RequestHandler
from atf.core.assert_handler import AssertHandler
import allure
import yaml

@allure.epic('tests')
class Test产品公开接口集成测试:
    @classmethod
    def setup_class(cls):
        log.info('========== 开始执行测试用例：test_产品公开接口集成测试 (测试产品列表、详情、筛选等公开接口) ==========')
        cls.test_case_data = cls.load_test_case_data()
        cls.steps_dict = {step['id']: step for step in cls.test_case_data['steps']}
        cls.session_vars = {}
        cls.global_vars = Globals.get_data()
        cls.testcase_host = 'http://localhost:8000'
        cls.VR = VariableResolver(global_vars=cls.global_vars, session_vars=cls.session_vars)
        log.info('Setup completed for Test产品公开接口集成测试')

    @staticmethod
    def load_test_case_data():
        with open(r'/Volumes/DATABASE/code/glam-cart/backend/tests/integration_products_public.yaml', 'r', encoding='utf-8') as file:
            test_case_data = yaml.safe_load(file)['testcase']
        return test_case_data

    @allure.story('产品公开接口集成测试')
    def test_产品公开接口集成测试(self):
        log.info('Starting test_产品公开接口集成测试')
        # Step: get_products
        log.info(f'开始执行 step: get_products')
        get_products = self.steps_dict.get('get_products')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=get_products['method'],
            url=step_host + self.VR.process_data(get_products['path']),
            headers=self.VR.process_data(get_products.get('headers')),
            data=self.VR.process_data(get_products.get('data')),
            params=self.VR.process_data(get_products.get('params')),
            files=self.VR.process_data(get_products.get('files'))
        )
        log.info(f'get_products 请求结果为：{response}')
        self.session_vars['get_products'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(get_products['assert']),
            response=response,
            db_config=db_config
        )

        # Step: get_featured
        log.info(f'开始执行 step: get_featured')
        get_featured = self.steps_dict.get('get_featured')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=get_featured['method'],
            url=step_host + self.VR.process_data(get_featured['path']),
            headers=self.VR.process_data(get_featured.get('headers')),
            data=self.VR.process_data(get_featured.get('data')),
            params=self.VR.process_data(get_featured.get('params')),
            files=self.VR.process_data(get_featured.get('files'))
        )
        log.info(f'get_featured 请求结果为：{response}')
        self.session_vars['get_featured'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(get_featured['assert']),
            response=response,
            db_config=db_config
        )

        # Step: get_filter_options
        log.info(f'开始执行 step: get_filter_options')
        get_filter_options = self.steps_dict.get('get_filter_options')
        step_host = self.testcase_host
        response = RequestHandler.send_request(
            method=get_filter_options['method'],
            url=step_host + self.VR.process_data(get_filter_options['path']),
            headers=self.VR.process_data(get_filter_options.get('headers')),
            data=self.VR.process_data(get_filter_options.get('data')),
            params=self.VR.process_data(get_filter_options.get('params')),
            files=self.VR.process_data(get_filter_options.get('files'))
        )
        log.info(f'get_filter_options 请求结果为：{response}')
        self.session_vars['get_filter_options'] = response
        db_config = None
        AssertHandler().handle_assertion(
            asserts=self.VR.process_data(get_filter_options['assert']),
            response=response,
            db_config=db_config
        )


        log.info(f"Test case test_产品公开接口集成测试 completed.")
